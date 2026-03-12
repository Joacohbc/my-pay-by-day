package com.mypaybyday.dto;

import java.math.BigDecimal;

/**
 * Pre-calculated balances for a specific category within a date range.
 * The AI uses this to avoid doing calculations itself.
 */
public record CategoryBalanceDto(
    Long categoryId,
    String categoryName,
    BigDecimal income,
    BigDecimal outbound
) {
}
