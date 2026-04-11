package com.mypaybyday.dto;

import com.mypaybyday.entity.TimePeriodBudgetEntity;

import java.math.BigDecimal;

public record TimePeriodBudgetDto(
	Long id,
	CategoryDto category,
	BigDecimal budgetedAmount
) {

    public static TimePeriodBudgetDto from(TimePeriodBudgetEntity budget) {
	return new TimePeriodBudgetDto(
		budget.id,
		budget.category != null ? CategoryDto.from(budget.category) : null,
		budget.budgetedAmount
	);
    }
}
