package com.mypaybyday.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * Asks for the conversion frozen on past transactions to be replaced with a chosen rate.
 *
 * @param sourceCurrency ISO 4217 code the affected transactions were recorded in
 * @param targetCurrency ISO 4217 code of the principal currency whose conversion is replaced
 * @param rate           units of {@code targetCurrency} per one unit of {@code sourceCurrency}
 * @param startDate      only transactions dated at or after this moment; open when {@code null}
 * @param endDate        only transactions dated at or before this moment; open when {@code null}
 */
public record RequestConversionRecalculationDto(
		String sourceCurrency,
		String targetCurrency,
		BigDecimal rate,
		@Schema(nullable = true) LocalDateTime startDate,
		@Schema(nullable = true) LocalDateTime endDate) {
}
