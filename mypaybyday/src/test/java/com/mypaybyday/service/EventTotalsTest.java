package com.mypaybyday.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import jakarta.inject.Inject;

import com.mypaybyday.dto.CreatePaymentPlanDto;
import com.mypaybyday.dto.CurrencyTotalsDto;
import com.mypaybyday.dto.CreatePaymentPlanItemDto;
import com.mypaybyday.dto.EventQuery;
import com.mypaybyday.dto.EventTotalsDto;
import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.FinanceNodeDto;
import com.mypaybyday.dto.PaymentPlanDto;
import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.entity.FinanceLineItemEntity;
import com.mypaybyday.entity.FinanceNodeEntity;
import com.mypaybyday.entity.FinanceTransactionEntity;
import com.mypaybyday.enums.EventType;
import com.mypaybyday.enums.FinanceNodeType;
import com.mypaybyday.enums.PaymentPlanItemStatus;
import com.mypaybyday.enums.PaymentPlanType;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.event.EventService;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Each test owns a distinct month so the totals it asserts cannot be disturbed by the events another
 * test creates in the same database.
 */
@QuarkusTest
class EventTotalsTest {

	private static final LocalDateTime TOTALS_MONTH = LocalDateTime.of(2019, 3, 4, 12, 0);
	private static final LocalDateTime TRANSFERS_MONTH = LocalDateTime.of(2019, 4, 4, 12, 0);
	private static final LocalDateTime GROUPING_MONTH = LocalDateTime.of(2019, 5, 4, 12, 0);
	private static final LocalDateTime MULTI_CURRENCY_MONTH = LocalDateTime.of(2019, 6, 4, 12, 0);
	private static final LocalDateTime DENOMINATION_MONTH = LocalDateTime.of(2019, 7, 4, 12, 0);

	private static final String USD = "USD";
	private static final String UYU = "UYU";

	@Inject
	EventService eventService;

	@Inject
	FinanceNodeService financeNodeService;

	@Inject
	PaymentPlanService paymentPlanService;

	@Test
	void summaryAggregatesEachEventTypeIntoItsOwnTotal() throws BusinessException {
		FinanceNodeEntity wallet = createNode("Totals Wallet", FinanceNodeType.OWN);
		FinanceNodeEntity savings = createNode("Totals Savings", FinanceNodeType.OWN);
		FinanceNodeEntity employer = createNode("Totals Employer", FinanceNodeType.EXTERNAL);
		FinanceNodeEntity store = createNode("Totals Store", FinanceNodeType.EXTERNAL);

		createEvent("Salary", EventType.INBOUND, wallet, employer, new BigDecimal("100.00"), TOTALS_MONTH);
		createEvent("Groceries", EventType.OUTBOUND, store, wallet, new BigDecimal("50.00"), TOTALS_MONTH);
		createEvent("To savings", EventType.OTHER, savings, wallet, new BigDecimal("30.00"), TOTALS_MONTH);

		EventTotalsDto totals = eventService.summary(monthQuery(TOTALS_MONTH).build());
		CurrencyTotalsDto usdTotals = totalsFor(totals, USD);

		assertEquals(0, new BigDecimal("100.00").compareTo(usdTotals.income()));
		assertEquals(0, new BigDecimal("50.00").compareTo(usdTotals.outbound()));
		assertEquals(0, new BigDecimal("30.00").compareTo(usdTotals.transfers()));
		assertEquals(3, totals.totalElements());
	}

	@Test
	void transferTotalCountsTheAmountMovedOnceRatherThanBothSidesOfTheTransaction() throws BusinessException {
		FinanceNodeEntity wallet = createNode("Transfer Wallet", FinanceNodeType.OWN);
		FinanceNodeEntity savings = createNode("Transfer Savings", FinanceNodeType.OWN);

		createEvent("Move to savings", EventType.OTHER, savings, wallet, new BigDecimal("40.00"), TRANSFERS_MONTH);

		EventTotalsDto totals = eventService.summary(monthQuery(TRANSFERS_MONTH).build());
		CurrencyTotalsDto usdTotals = totalsFor(totals, USD);

		assertEquals(0, new BigDecimal("40.00").compareTo(usdTotals.transfers()));
		assertEquals(0, BigDecimal.ZERO.compareTo(usdTotals.income()));
		assertEquals(1, totals.totalElements());
	}

	@Test
	void listedEventsReportThePaymentPlanTheyBelongTo() throws BusinessException {
		FinanceNodeEntity wallet = createNode("Grouped Wallet", FinanceNodeType.OWN);
		FinanceNodeEntity store = createNode("Grouped Store", FinanceNodeType.EXTERNAL);

		FinanceEventDto grouped = createEvent("Trip dinner", EventType.OUTBOUND, store, wallet,
				new BigDecimal("20.00"), GROUPING_MONTH);
		FinanceEventDto ungrouped = createEvent("Solo coffee", EventType.OUTBOUND, store, wallet,
				new BigDecimal("5.00"), GROUPING_MONTH);

		LocalDate groupStart = GROUPING_MONTH.toLocalDate();
		PaymentPlanDto plan = paymentPlanService.create(new CreatePaymentPlanDto(
			"Trip", null, PaymentPlanType.GROUP, null, null, null, null, groupStart, null,
			false, false, null, false, null, null, null, null, null, null));
		paymentPlanService.createItem(plan.id(),
			new CreatePaymentPlanItemDto(1, groupStart, PaymentPlanItemStatus.PAID, grouped.id(), null));

		List<FinanceEventDto> listed = eventService.listAll(monthQuery(GROUPING_MONTH).build()).content();

		assertEquals(plan.id(), findById(listed, grouped.id()).paymentPlanId());
		assertNull(findById(listed, ungrouped.id()).paymentPlanId());
	}

	@Test
	void totalsInDifferentCurrenciesAreReportedSideBySideRatherThanSummedTogether() throws BusinessException {
		FinanceNodeEntity wallet = createNode("Mixed Wallet", FinanceNodeType.OWN, null);
		FinanceNodeEntity store = createNode("Mixed Store", FinanceNodeType.EXTERNAL, null);

		createEvent("Coffee", EventType.OUTBOUND, store, wallet, new BigDecimal("3.00"), MULTI_CURRENCY_MONTH, USD);
		createEvent("Almuerzo", EventType.OUTBOUND, store, wallet, new BigDecimal("450.00"), MULTI_CURRENCY_MONTH, UYU);

		EventTotalsDto totals = eventService.summary(monthQuery(MULTI_CURRENCY_MONTH).build());

		assertEquals(2, totals.totals().size());
		assertEquals(0, new BigDecimal("3.00").compareTo(totalsFor(totals, USD).outbound()));
		assertEquals(0, new BigDecimal("450.00").compareTo(totalsFor(totals, UYU).outbound()));
		assertEquals(2, totals.totalElements());
	}

	@Test
	void anEventMixingTwoCurrenciesIsRejectedBecauseItsAmountsCannotBalance() throws BusinessException {
		FinanceNodeEntity wallet = createNode("Crossing Wallet", FinanceNodeType.OWN, null);
		FinanceNodeEntity exchange = createNode("Crossing Exchange", FinanceNodeType.EXTERNAL, null);

		FinanceTransactionEntity transaction = new FinanceTransactionEntity();
		transaction.transactionDate = DENOMINATION_MONTH;
		transaction.lineItems.add(lineItem(wallet, new BigDecimal("25.00"), USD));
		transaction.lineItems.add(lineItem(exchange, new BigDecimal("-1000.00"), UYU));

		FinanceEventEntity event = new FinanceEventEntity();
		event.name = "Compra de dolares";
		event.type = EventType.OTHER;
		event.transaction = transaction;

		BusinessException rejection = assertThrows(BusinessException.class, () -> eventService.create(event));
		assertTrue(rejection.getMessage().contains(USD) && rejection.getMessage().contains(UYU));
	}

	@Test
	void anAmountRecordedAgainstAnAccountDenominatedInAnotherCurrencyIsRejected() throws BusinessException {
		FinanceNodeEntity pesosAccount = createNode("Cuenta en pesos", FinanceNodeType.OWN, UYU);
		FinanceNodeEntity store = createNode("Denomination Store", FinanceNodeType.EXTERNAL, null);

		assertThrows(BusinessException.class, () -> createEvent(
				"Compra en dolares", EventType.OUTBOUND, store, pesosAccount,
				new BigDecimal("15.00"), DENOMINATION_MONTH, USD));
	}

	private CurrencyTotalsDto totalsFor(EventTotalsDto totals, String currency) {
		return totals.totals().stream()
				.filter(entry -> currency.equals(entry.currency()))
				.findFirst()
				.orElseThrow();
	}

	private EventQuery.Builder monthQuery(LocalDateTime month) {
		LocalDate firstDay = month.toLocalDate().withDayOfMonth(1);
		return EventQuery.builder()
				.startDate(firstDay.atStartOfDay().toString())
				.endDate(firstDay.plusMonths(1).atStartOfDay().toString());
	}

	private FinanceEventDto findById(List<FinanceEventDto> events, Long id) {
		return events.stream().filter(event -> id.equals(event.id())).findFirst().orElseThrow();
	}

	private FinanceNodeEntity createNode(String name, FinanceNodeType type) throws BusinessException {
		return createNode(name, type, null);
	}

	private FinanceNodeEntity createNode(String name, FinanceNodeType type, String currency) throws BusinessException {
		FinanceNodeDto created = financeNodeService.create(
				new FinanceNodeDto(null, name, type, null, null, null, false, currency));
		FinanceNodeEntity node = new FinanceNodeEntity();
		node.id = created.id();
		return node;
	}

	private FinanceEventDto createEvent(String name, EventType type, FinanceNodeEntity destination,
			FinanceNodeEntity origin, BigDecimal amount, LocalDateTime when) throws BusinessException {
		return createEvent(name, type, destination, origin, amount, when, USD);
	}

	private FinanceEventDto createEvent(String name, EventType type, FinanceNodeEntity destination,
			FinanceNodeEntity origin, BigDecimal amount, LocalDateTime when, String currency) throws BusinessException {
		FinanceTransactionEntity transaction = new FinanceTransactionEntity();
		transaction.transactionDate = when;
		transaction.lineItems.add(lineItem(destination, amount, currency));
		transaction.lineItems.add(lineItem(origin, amount.negate(), currency));

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
