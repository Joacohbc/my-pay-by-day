package com.mypaybyday.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Everything a balance reports about one currency.
 *
 * <p>When a view asks for no particular currency, a balance spanning several currencies is a list
 * of these, one per currency, since adding UYU to USD without a rate would invent a number. When
 * it asks for one, the list holds a single entry in that currency: every event converted with the
 * rate frozen on it (a principal currency) or only the events recorded in it (any other).
 *
 * @param currency       ISO 4217 code every amount in this bucket is denominated in
 * @param income         sum of positive line-item amounts across {@code INBOUND} events
 * @param outbound       sum of positive line-item amounts across {@code OUTBOUND} events
 * @param categoryBudgets per-category budgeted and spent amounts, limited to this currency
 * @param unconvertedEvents events left out of a converted view because they hold no rate to this
 *                          currency yet; always 0 when amounts are reported in their own currency
 */
public record CurrencyBalanceDto(
		String currency,
		BigDecimal income,
		BigDecimal outbound,
		List<CategoryBudgetSummaryDto> categoryBudgets,
		int unconvertedEvents) {

	public CurrencyBalanceDto withUnconvertedEvents(int count) {
		return new CurrencyBalanceDto(currency, income, outbound, categoryBudgets, count);
	}
}
