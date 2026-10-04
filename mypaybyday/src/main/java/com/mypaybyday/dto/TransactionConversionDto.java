package com.mypaybyday.dto;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Collection;
import java.util.Comparator;
import java.util.Currency;
import java.util.List;

import com.mypaybyday.entity.TransactionConversionEntity;
import com.mypaybyday.enums.ConversionOrigin;

/**
 * The value of an event in one currency other than the one it was recorded in, computed with the
 * rate frozen on it.
 *
 * @param currency ISO 4217 code of the converted amount
 * @param rate     units of {@code currency} per one unit of the event's own currency
 * @param amount   the event's amount multiplied by {@code rate}, rounded to the currency's minor unit
 * @param origin   whether the rate was frozen when the event was recorded, later retroactively, or
 *                 replaced by a recalculation
 * @param frozenAt when the rate was frozen, or last replaced
 */
public record TransactionConversionDto(
		String currency,
		BigDecimal rate,
		BigDecimal amount,
		ConversionOrigin origin,
		Instant frozenAt) {

	private static final int FALLBACK_FRACTION_DIGITS = 2;

	public static List<TransactionConversionDto> fromAll(Collection<TransactionConversionEntity> conversions,
			BigDecimal eventAmount) {
		if (conversions == null) return List.of();
		return conversions.stream()
				.sorted(Comparator.comparing((TransactionConversionEntity conversion) -> conversion.currency))
				.map(conversion -> new TransactionConversionDto(
						conversion.currency,
						conversion.rate,
						convert(eventAmount, conversion.rate, conversion.currency),
						conversion.origin,
						frozenAtOf(conversion)))
				.toList();
	}

	private static Instant frozenAtOf(TransactionConversionEntity conversion) {
		return conversion.updatedAt != null ? conversion.updatedAt : conversion.createdAt;
	}

	/**
	 * Multiplies an amount by a rate and rounds it to the target currency's minor unit (two decimals
	 * for most, none for JPY), which is the precision the amount would have had if it had been
	 * recorded in that currency directly.
	 */
	public static BigDecimal convert(BigDecimal amount, BigDecimal rate, String targetCurrency) {
		if (amount == null) return null;
		return amount.multiply(rate).setScale(fractionDigitsOf(targetCurrency), RoundingMode.HALF_EVEN);
	}

	private static int fractionDigitsOf(String currency) {
		int digits = Currency.getInstance(currency).getDefaultFractionDigits();
		return digits >= 0 ? digits : FALLBACK_FRACTION_DIGITS;
	}
}
