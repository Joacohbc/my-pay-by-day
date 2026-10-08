package com.mypaybyday.service.currency;

import java.math.BigDecimal;

import jakarta.inject.Inject;

import com.mypaybyday.dto.ExchangeRateDto;
import com.mypaybyday.dto.RecordExchangeRateDto;
import com.mypaybyday.enums.ExchangeRateSource;
import com.mypaybyday.exception.BusinessException;

import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

@QuarkusTest
class RecordExchangeRateSourceTest {

	@Inject
	ExchangeRateService exchangeRateService;

	@Test
	@TestTransaction
	void aRateWithoutASourceIsManual() throws BusinessException {
		assertEquals(ExchangeRateSource.MANUAL,
				exchangeRateService.recordRate(new RecordExchangeRateDto("UYU", new BigDecimal("40"))).source());
	}

	@Test
	@TestTransaction
	void aProviderQuoteSavedAsFetchedKeepsItsSourceAndProvider() throws BusinessException {
		ExchangeRateDto recorded = exchangeRateService.recordRate(
				new RecordExchangeRateDto("UYU", new BigDecimal("40.40"), ExchangeRateSource.API, " Bank "));

		assertEquals(ExchangeRateSource.API, recorded.source());
		assertEquals("Bank", recorded.provider());
	}

	@Test
	@TestTransaction
	void aManualRateCannotNameAProvider() {
		RecordExchangeRateDto manualRateNamingAProvider =
				new RecordExchangeRateDto("UYU", new BigDecimal("40"), ExchangeRateSource.MANUAL, "Bank");

		assertThrows(BusinessException.class, () -> exchangeRateService.recordRate(manualRateNamingAProvider));
	}
}
