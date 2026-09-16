package com.mypaybyday.dto;

import java.math.BigDecimal;

/**
 * Aggregate totals for one currency within an {@link EventQuery}'s match set.
 *
 * @param currency ISO 4217 code every amount here is denominated in
 * @param income   sum of positive line-item amounts across {@code INBOUND} events
 * @param outbound sum of positive line-item amounts across {@code OUTBOUND} events
 * @param transfers sum, across {@code OTHER} events, of half the sum of absolute line-item
 *                  amounts (the amount actually moved, per the Zero-Sum Rule)
 */
public record CurrencyTotalsDto(
		String currency,
		BigDecimal income,
		BigDecimal outbound,
		BigDecimal transfers) {
}
