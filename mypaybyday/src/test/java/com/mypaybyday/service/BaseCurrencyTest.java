package com.mypaybyday.service;

import java.math.BigDecimal;
import java.util.List;

import jakarta.inject.Inject;

import com.mypaybyday.dto.CurrencyDto;
import com.mypaybyday.dto.RecordExchangeRateDto;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.currency.CurrencyService;
import com.mypaybyday.service.currency.ExchangeRateService;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The base currency is global state that every other currency test quotes against, so each test
 * hands the base back to USD afterwards.
 */
@QuarkusTest
class BaseCurrencyTest {

	private static final String USD = "USD";
	private static final String UYU = "UYU";
	private static final String EUR = "EUR";
	private static final String CHF = "CHF";

	@Inject
	CurrencyService currencyService;

	@Inject
	ExchangeRateService exchangeRateService;

	@AfterEach
	void restoreUsdAsBase() throws BusinessException {
		currencyService.makeBase(USD);
	}

	@Test
	void changingTheBaseReexpressesEveryQuoteAgainstItAndKeepsCrossRates() throws BusinessException {
		quote(UYU, "40");
		quote(EUR, "0.8");

		currencyService.makeBase(UYU);

		List<CurrencyDto> currencies = currencyService.listCurrencies();
		CurrencyDto pesos = find(currencies, UYU);
		assertTrue(pesos.base());
		assertNull(pesos.currentRate());
		assertRate("0.025", find(currencies, USD));
		assertRate("0.02", find(currencies, EUR));
	}

	@Test
	void makingACurrencyWithoutAQuoteTheBaseIsRejectedWhileOthersAreQuoted() throws BusinessException {
		quote(UYU, "40");

		assertThrows(BusinessException.class, () -> currencyService.makeBase(CHF));
		assertTrue(find(currencyService.listCurrencies(), USD).base());
	}

	private void quote(String currency, String unitsPerBase) throws BusinessException {
		exchangeRateService.recordManualRate(new RecordExchangeRateDto(currency, new BigDecimal(unitsPerBase)));
	}

	private static CurrencyDto find(List<CurrencyDto> currencies, String code) {
		return currencies.stream().filter(currency -> currency.code().equals(code)).findFirst().orElseThrow();
	}

	private static void assertRate(String expectedUnitsPerBase, CurrencyDto currency) {
		BigDecimal unitsPerBase = currency.currentRate().unitsPerBase();
		assertEquals(0, new BigDecimal(expectedUnitsPerBase).compareTo(unitsPerBase),
				currency.code() + " was " + unitsPerBase);
	}
}
