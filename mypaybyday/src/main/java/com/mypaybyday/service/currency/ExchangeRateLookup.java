package com.mypaybyday.service.currency;

import java.math.BigDecimal;
import java.util.Map;
import java.util.stream.Collectors;

import jakarta.enterprise.context.ApplicationScoped;

import org.eclipse.microprofile.config.inject.ConfigProperty;

import com.mypaybyday.entity.ExchangeRateEntity;
import com.mypaybyday.repository.CurrencyRepository;
import com.mypaybyday.repository.ExchangeRateRepository;

/**
 * Reads the current quotes. Kept apart from {@link CurrencyService} so that recording a
 * transaction, backfilling conversions and rendering a view can all read rates without depending on
 * the service that writes them.
 */
@ApplicationScoped
public class ExchangeRateLookup {

	private final ExchangeRateRepository exchangeRateRepository;
	private final CurrencyRepository currencyRepository;
	private final String initialBaseCurrency;

	public ExchangeRateLookup(
			ExchangeRateRepository exchangeRateRepository,
			CurrencyRepository currencyRepository,
			@ConfigProperty(name = "mypaybyday.exchange-rate.base-currency") String initialBaseCurrency) {
		this.exchangeRateRepository = exchangeRateRepository;
		this.currencyRepository = currencyRepository;
		this.initialBaseCurrency = initialBaseCurrency.trim().toUpperCase();
	}

	/**
	 * The currency the user chose as base, or the configured one until they choose.
	 */
	public String baseCurrency() {
		return currencyRepository.findBase()
				.map(currency -> currency.code)
				.orElse(initialBaseCurrency);
	}

	public ExchangeRateQuotes currentQuotes() {
		String baseCurrency = baseCurrency();
		Map<String, BigDecimal> unitsPerBase = exchangeRateRepository.listLatestPerCurrency(baseCurrency).stream()
				.collect(Collectors.toMap(
						(ExchangeRateEntity rate) -> rate.currency,
						(ExchangeRateEntity rate) -> rate.unitsPerBase));
		return new ExchangeRateQuotes(baseCurrency, Map.copyOf(unitsPerBase));
	}
}
