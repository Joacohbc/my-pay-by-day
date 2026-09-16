package com.mypaybyday.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Everything a balance reports about one currency.
 *
 * <p>A balance spanning several currencies is a list of these rather than a set of summed
 * scalars: with no exchange rates, income in UYU and income in USD are two separate facts, and
 * adding them would invent a number that means nothing. Within a single bucket every field is a
 * plain amount again, directly comparable, exactly as a single-currency ledger always was.
 *
 * @param currency       ISO 4217 code every amount in this bucket is denominated in
 * @param income         sum of positive line-item amounts across {@code INBOUND} events
 * @param outbound       sum of positive line-item amounts across {@code OUTBOUND} events
 * @param categoryBudgets per-category budgeted and spent amounts, limited to this currency
 */
public record CurrencyBalanceDto(
		String currency,
		BigDecimal income,
		BigDecimal outbound,
		List<CategoryBudgetSummaryDto> categoryBudgets) {
}
