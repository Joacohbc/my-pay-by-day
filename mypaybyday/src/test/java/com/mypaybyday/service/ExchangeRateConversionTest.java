package com.mypaybyday.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import jakarta.inject.Inject;

import com.mypaybyday.dto.ConversionBackfillBatchDto;
import com.mypaybyday.dto.CurrencyDto;
import com.mypaybyday.dto.CurrencyTotalsDto;
import com.mypaybyday.dto.EventQuery;
import com.mypaybyday.dto.EventTotalsDto;
import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.FinanceNodeDto;
import com.mypaybyday.dto.MoneyDto;
import com.mypaybyday.dto.RecordExchangeRateDto;
import com.mypaybyday.dto.TransactionConversionDto;
import com.mypaybyday.dto.UpdateCurrencyDto;
import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.entity.FinanceLineItemEntity;
import com.mypaybyday.entity.FinanceNodeEntity;
import com.mypaybyday.entity.FinanceTransactionEntity;
import com.mypaybyday.enums.ConversionOrigin;
import com.mypaybyday.enums.EventType;
import com.mypaybyday.enums.FinanceNodeType;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.currency.CurrencyService;
import com.mypaybyday.service.currency.ExchangeRateService;
import com.mypaybyday.service.event.EventService;
import com.mypaybyday.service.event.TransactionConversionService;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Principal currencies are global state, so every test switches them off again afterwards; each
 * test also owns a distinct month so its totals are not disturbed by the events of the others.
 */
@QuarkusTest
class ExchangeRateConversionTest {

	private static final LocalDateTime FREEZE_MONTH = LocalDateTime.of(2018, 1, 10, 12, 0);
	private static final LocalDateTime CONVERTED_VIEW_MONTH = LocalDateTime.of(2018, 2, 10, 12, 0);
	private static final LocalDateTime FILTERED_VIEW_MONTH = LocalDateTime.of(2018, 3, 10, 12, 0);
	private static final LocalDateTime BACKFILL_MONTH = LocalDateTime.of(2018, 4, 10, 12, 0);
	private static final LocalDateTime MISSING_QUOTE_MONTH = LocalDateTime.of(2018, 5, 10, 12, 0);

	private static final String USD = "USD";
	private static final String UYU = "UYU";
	private static final String ARS = "ARS";
	private static final String EUR = "EUR";
	private static final String BRL = "BRL";

	@Inject
	EventService eventService;

	@Inject
	FinanceNodeService financeNodeService;

	@Inject
	CurrencyService currencyService;

	@Inject
	ExchangeRateService exchangeRateService;

	@Inject
	TransactionConversionService transactionConversionService;

	@AfterEach
	void switchOffPrincipalCurrencies() throws BusinessException {
		for (CurrencyDto currency : currencyService.listCurrencies()) {
			if (currency.principal()) {
				currencyService.updateCurrency(currency.code(), new UpdateCurrencyDto(false));
			}
		}
	}

	@Test
	void recordingAnEventFreezesTheCurrentRateAndANewQuoteDoesNotRepriceIt() throws BusinessException {
		quote(UYU, "40");
		makePrincipal(UYU);
		FinanceNodeEntity wallet = createNode("Freeze Wallet");
		FinanceNodeEntity store = createNode("Freeze Store");

		FinanceEventDto dinner = createEvent("Dinner", EventType.OUTBOUND, store, wallet, "100.00", USD, FREEZE_MONTH);
		quote(UYU, "45");
		FinanceEventDto lunch = createEvent("Lunch", EventType.OUTBOUND, store, wallet, "100.00", USD, FREEZE_MONTH);

		TransactionConversionDto dinnerInPesos = conversionTo(eventService.findById(dinner.id()), UYU);
		assertEquals(0, new BigDecimal("40").compareTo(dinnerInPesos.rate()));
		assertEquals(0, new BigDecimal("4000.00").compareTo(dinnerInPesos.amount()));
		assertEquals(ConversionOrigin.AT_ENTRY, dinnerInPesos.origin());
		assertEquals(0, new BigDecimal("4500.00").compareTo(conversionTo(lunch, UYU).amount()));
	}

	@Test
	void aPrincipalCurrencyViewConvertsEveryEventWithTheRateFrozenOnIt() throws BusinessException {
		quote(UYU, "40");
		makePrincipal(UYU);
		FinanceNodeEntity wallet = createNode("Converted Wallet");
		FinanceNodeEntity store = createNode("Converted Store");

		createEvent("Books", EventType.OUTBOUND, store, wallet, "100.00", USD, CONVERTED_VIEW_MONTH);
		createEvent("Bus", EventType.OUTBOUND, store, wallet, "500.00", UYU, CONVERTED_VIEW_MONTH);
		quote(UYU, "50");

		EventTotalsDto totals = eventService.summary(monthQuery(CONVERTED_VIEW_MONTH).currency(UYU).build());

		assertEquals(1, totals.totals().size());
		CurrencyTotalsDto pesos = totals.totals().get(0);
		assertEquals(UYU, pesos.currency());
		assertEquals(0, new BigDecimal("4500.00").compareTo(pesos.outbound()));
		assertEquals(0, pesos.unconvertedEvents());

		List<MoneyDto> walletBalance = financeNodeService.calculateBalance(wallet.id, UYU);
		assertEquals(List.of(new MoneyDto(new BigDecimal("-4500.00"), UYU)), walletBalance);
	}

	@Test
	void aNonPrincipalCurrencyViewOnlyShowsEventsRecordedInIt() throws BusinessException {
		quote(UYU, "40");
		makePrincipal(UYU);
		quote(ARS, "1000");
		FinanceNodeEntity wallet = createNode("Filtered Wallet");
		FinanceNodeEntity store = createNode("Filtered Store");

		createEvent("Asado", EventType.OUTBOUND, store, wallet, "20000.00", ARS, FILTERED_VIEW_MONTH);
		createEvent("Taxi", EventType.OUTBOUND, store, wallet, "10.00", USD, FILTERED_VIEW_MONTH);

		EventTotalsDto totals = eventService.summary(monthQuery(FILTERED_VIEW_MONTH).currency(ARS).build());

		assertEquals(1, totals.totalElements());
		assertEquals(0, new BigDecimal("20000.00").compareTo(totals.totals().get(0).outbound()));
		assertEquals(1, eventService.listAll(monthQuery(FILTERED_VIEW_MONTH).currency(ARS).build()).totalElements());
	}

	@Test
	void makingACurrencyPrincipalConvertsPastEventsRetroactively() throws BusinessException {
		FinanceNodeEntity wallet = createNode("Backfill Wallet");
		FinanceNodeEntity store = createNode("Backfill Store");
		quote(UYU, "40");
		FinanceEventDto rent = createEvent("Rent", EventType.OUTBOUND, store, wallet, "20000.00", UYU, BACKFILL_MONTH);
		assertTrue(rent.conversions().isEmpty());

		quote(EUR, "0.8");
		makePrincipal(EUR);
		runBackfill(EUR);

		TransactionConversionDto rentInEuros = conversionTo(eventService.findById(rent.id()), EUR);
		assertEquals(ConversionOrigin.RETROACTIVE, rentInEuros.origin());
		assertEquals(0, new BigDecimal("400.00").compareTo(rentInEuros.amount()));
	}

	@Test
	void recordingInACurrencyWithoutAQuoteIsRejectedWhileAPrincipalCurrencyExists() throws BusinessException {
		quote(UYU, "40");
		makePrincipal(UYU);
		FinanceNodeEntity wallet = createNode("Missing Quote Wallet");
		FinanceNodeEntity store = createNode("Missing Quote Store");

		assertThrows(BusinessException.class,
				() -> createEvent("Caipirinha", EventType.OUTBOUND, store, wallet, "30.00", BRL, MISSING_QUOTE_MONTH));
		assertThrows(BusinessException.class, () -> makePrincipal(BRL));
	}

	private void runBackfill(String currency) {
		long resumeAfterId = 0;
		ConversionBackfillBatchDto batch;
		do {
			batch = transactionConversionService.backfillBatch(currency, resumeAfterId);
			resumeAfterId = batch.lastTransactionId();
		} while (batch.hasMore());
	}

	private void quote(String currency, String unitsPerUsd) throws BusinessException {
		exchangeRateService.recordManualRate(new RecordExchangeRateDto(currency, new BigDecimal(unitsPerUsd)));
	}

	private void makePrincipal(String currency) throws BusinessException {
		currencyService.updateCurrency(currency, new UpdateCurrencyDto(true));
	}

	private TransactionConversionDto conversionTo(FinanceEventDto event, String currency) {
		return event.conversions().stream()
				.filter(conversion -> conversion.currency().equals(currency))
				.findFirst()
				.orElseThrow(() -> new AssertionError("No conversion to " + currency + " on " + event.name()));
	}

	private EventQuery.Builder monthQuery(LocalDateTime month) {
		return EventQuery.builder()
				.startDate(month.withDayOfMonth(1).toLocalDate().atStartOfDay().toString())
				.endDate(month.withDayOfMonth(28).toLocalDate().atTime(23, 59).toString())
				.size(100);
	}

	private FinanceNodeEntity createNode(String name) throws BusinessException {
		FinanceNodeDto created = financeNodeService.create(
				new FinanceNodeDto(null, name, FinanceNodeType.OWN, null, null, null, false, null));
		FinanceNodeEntity node = new FinanceNodeEntity();
		node.id = created.id();
		return node;
	}

	private FinanceEventDto createEvent(String name, EventType type, FinanceNodeEntity destination,
			FinanceNodeEntity origin, String amount, String currency, LocalDateTime when) throws BusinessException {
		BigDecimal value = new BigDecimal(amount);
		FinanceTransactionEntity transaction = new FinanceTransactionEntity();
		transaction.transactionDate = when;
		transaction.lineItems.add(lineItem(destination, value, currency));
		transaction.lineItems.add(lineItem(origin, value.negate(), currency));

		FinanceEventEntity event = new FinanceEventEntity();
		event.name = name;
		event.type = type;
		event.transaction = transaction;
		return eventService.create(event);
	}

	private FinanceLineItemEntity lineItem(FinanceNodeEntity node, BigDecimal amount, String currency) {
		FinanceLineItemEntity lineItem = new FinanceLineItemEntity();
		lineItem.financeNode = node;
		lineItem.amount = amount;
		lineItem.currency = currency;
		return lineItem;
	}
}
