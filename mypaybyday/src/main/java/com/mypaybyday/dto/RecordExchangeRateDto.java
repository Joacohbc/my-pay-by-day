package com.mypaybyday.dto;

import java.math.BigDecimal;

import com.mypaybyday.enums.ExchangeRateSource;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * A quote the user records.
 *
 * @param currency     ISO 4217 code being quoted
 * @param unitsPerBase how many units of {@code currency} buy one unit of the base currency
 * @param source       where the figure came from: {@code API} when the user saves a provider quote
 *                     as fetched; {@code null} or {@code MANUAL} when they typed or edited it
 * @param provider     the provider an {@code API} figure came from; only allowed with {@code API}
 */
public record RecordExchangeRateDto(
		String currency,
		BigDecimal unitsPerBase,
		@Schema(nullable = true) ExchangeRateSource source,
		@Schema(nullable = true) String provider) {

	public RecordExchangeRateDto(String currency, BigDecimal unitsPerBase) {
		this(currency, unitsPerBase, null, null);
	}
}
