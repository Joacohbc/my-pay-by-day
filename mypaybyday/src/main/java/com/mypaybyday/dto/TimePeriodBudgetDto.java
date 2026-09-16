package com.mypaybyday.dto;

import java.math.BigDecimal;

import com.mypaybyday.entity.TimePeriodBudgetEntity;

public record TimePeriodBudgetDto(
	Long id,
	CategoryDto category,
	BigDecimal budgetedAmount,
	String currency
) {

    public static TimePeriodBudgetDto from(TimePeriodBudgetEntity budget) {
	return new TimePeriodBudgetDto(
		budget.id,
		budget.category != null ? CategoryDto.from(budget.category) : null,
		budget.budgetedAmount,
		budget.currency
	);
    }
}
