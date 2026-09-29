package com.mypaybyday.service.currency;

import java.math.BigDecimal;
import java.util.Map;
import java.util.stream.Collectors;

import jakarta.enterprise.context.ApplicationScoped;

import org.eclipse.microprofile.config.inject.ConfigProperty;

import com.mypaybyday.entity.ExchangeRateEntity;
import com.mypaybyday.repository.ExchangeRateRepository;

/**
 * Reads the current quotes. Kept apart from {@link CurrencyService} so that recording a
 * transaction, backfilling conversions and rendering a view can all read rates without depending on
 * the service that writes them.
 */
@ApplicationScoped
public class ExchangeRateLookup {

	private final ExchangeRateRepository exchangeRateRepository;
	private final String baseCurrency;

	public ExchangeRateLookup(
			ExchangeRateRepository exchangeRateRepository,
			@ConfigProperty(name = "mypaybyday.exchange-rate.base-currency") String baseCurrency) {
		this.exchangeRateRepository = exchangeRateRepository;
		this.baseCurrency = baseCurrency.trim().toUpperCase();
	}

	public String baseCurrency() {
		return baseCurrency;
	}

	public ExchangeRateQuotes currentQuotes() {
		Map<String, BigDecimal> unitsPerBase = exchangeRateRepository.listLatestPerCurrency(baseCurrency).stream()
				.collect(Collectors.toMap(
						(ExchangeRateEntity rate) -> rate.currency,
						(ExchangeRateEntity rate) -> rate.unitsPerBase));
		return new ExchangeRateQuotes(baseCurrency, Map.copyOf(unitsPerBase));
	}
}
