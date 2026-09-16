package com.mypaybyday.dto;

import java.util.List;

/**
 * Pre-calculated balances for a specific category within a date range, split by currency.
 * The AI uses this to avoid doing calculations itself.
 */
public record CategoryBalanceDto(
	Long categoryId,
	String categoryName,
	List<CurrencyBalanceDto> balances
) {
}
