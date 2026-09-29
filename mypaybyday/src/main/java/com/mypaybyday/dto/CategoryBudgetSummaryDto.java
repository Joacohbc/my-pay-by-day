package com.mypaybyday.dto;

import java.math.BigDecimal;

public record CategoryBudgetSummaryDto(
	CategoryDto category,
	BigDecimal budgetedAmount,
	BigDecimal spentAmount
) {
	// Both amounts are denominated by the enclosing CurrencyBalanceDto's currency.
}
