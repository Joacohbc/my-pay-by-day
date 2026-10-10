package com.mypaybyday.dto;

import java.math.BigDecimal;
import java.time.Instant;

import com.mypaybyday.entity.ExchangeRateEntity;
import com.mypaybyday.enums.ExchangeRateSource;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * One recorded quote: {@code unitsPerBase} units of {@code currency} buy one unit of
 * {@code baseCurrency}.
 *
 * @param provider   name of the provider an {@code API} quote came from; {@code null} otherwise
 * @param recordedAt when the quote was recorded; the newest one per currency is the current rate
 */
public record ExchangeRateDto(
		Long id,
		String currency,
		String baseCurrency,
		BigDecimal unitsPerBase,
		ExchangeRateSource source,
		@Schema(nullable = true) String provider,
		Instant recordedAt) {

	public static ExchangeRateDto from(ExchangeRateEntity rate) {
		return new ExchangeRateDto(rate.id, rate.currency, rate.baseCurrency, rate.unitsPerBase, rate.source,
				rate.provider, rate.createdAt);
	}
}
