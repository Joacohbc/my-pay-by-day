package com.mypaybyday.dto;

import com.mypaybyday.entity.TimePeriodBudget;

import java.math.BigDecimal;

public record TimePeriodBudgetDto(
        Long id,
        CategoryDto category,
        BigDecimal budgetedAmount
) {
    public static TimePeriodBudgetDto from(TimePeriodBudget budget) {
        return new TimePeriodBudgetDto(
                budget.id,
                budget.category != null ? CategoryDto.from(budget.category) : null,
                budget.budgetedAmount
        );
    }
}
