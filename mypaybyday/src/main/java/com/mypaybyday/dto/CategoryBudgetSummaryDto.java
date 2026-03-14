package com.mypaybyday.dto;

import java.math.BigDecimal;

public record CategoryBudgetSummaryDto(
        CategoryDto category,
        BigDecimal budgetedAmount,
        BigDecimal spentAmount
) {
}
