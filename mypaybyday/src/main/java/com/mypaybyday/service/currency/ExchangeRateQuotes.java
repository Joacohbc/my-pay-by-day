package com.mypaybyday.service.currency;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;

/**
 * The current quote of every currency against one base, frozen at a single moment so a whole
 * operation converts with one consistent set of rates.
 *
 * @param baseCurrency the currency every quote is expressed against; its own quote is 1
 * @param unitsPerBase units of each quoted currency that buy one unit of {@code baseCurrency}
 */
public record ExchangeRateQuotes(String baseCurrency, Map<String, BigDecimal> unitsPerBase) {

	/** Digits kept on a cross rate: enough that converting a large amount never loses a cent. */
	static final int RATE_SCALE = 12;

	public boolean isQuoted(String currency) {
		return baseCurrency.equals(currency) || unitsPerBase.containsKey(currency);
	}

	/**
	 * @return units of {@code toCurrency} per one unit of {@code fromCurrency}, or empty when either
	 *         side has no quote
	 */
	public Optional<BigDecimal> rate(String fromCurrency, String toCurrency) {
		if (fromCurrency.equals(toCurrency)) return Optional.of(BigDecimal.ONE);

		Optional<BigDecimal> fromUnitsPerBase = unitsPerBaseOf(fromCurrency);
		Optional<BigDecimal> toUnitsPerBase = unitsPerBaseOf(toCurrency);
		if (fromUnitsPerBase.isEmpty() || toUnitsPerBase.isEmpty()) return Optional.empty();

		BigDecimal crossRate = toUnitsPerBase.get().divide(fromUnitsPerBase.get(), RATE_SCALE, RoundingMode.HALF_EVEN);
		return Optional.of(crossRate.stripTrailingZeros());
	}

	/**
	 * @return the first of the given currencies that has no quote, to name in an error
	 */
	public Optional<String> firstUnquoted(String... currencies) {
		return Stream.of(currencies).filter(currency -> !isQuoted(currency)).findFirst();
	}

	private Optional<BigDecimal> unitsPerBaseOf(String currency) {
		if (baseCurrency.equals(currency)) return Optional.of(BigDecimal.ONE);
		return Optional.ofNullable(unitsPerBase.get(currency));
	}
}
