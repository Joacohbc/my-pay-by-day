package com.mypaybyday.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * A currency the user works with, as the settings screen shows it.
 *
 * @param code              ISO 4217 code
 * @param principal         whether every transaction is converted into it
 * @param base              whether it is the currency every quote is expressed against
 * @param currentRate       its newest quote, or {@code null} when none was recorded (always
 *                          {@code null} for the base currency, whose rate is 1 by definition)
 * @param conversionPending whether past transactions are still being converted into it
 */
public record CurrencyDto(
		String code,
		boolean principal,
		boolean base,
		@Schema(nullable = true) ExchangeRateDto currentRate,
		boolean conversionPending) {
}
