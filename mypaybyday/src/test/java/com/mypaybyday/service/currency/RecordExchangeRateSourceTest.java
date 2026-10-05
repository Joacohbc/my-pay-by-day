package com.mypaybyday.service.currency;

import java.math.BigDecimal;

import jakarta.inject.Inject;

import com.mypaybyday.dto.RecordExchangeRateDto;
import com.mypaybyday.enums.ExchangeRateSource;
import com.mypaybyday.exception.BusinessException;

import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

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
	void aProviderQuoteSavedAsFetchedKeepsItsSource() throws BusinessException {
		assertEquals(ExchangeRateSource.API,
				exchangeRateService.recordRate(new RecordExchangeRateDto("UYU", new BigDecimal("41.65"), ExchangeRateSource.API)).source());
	}
}
