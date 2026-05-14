package com.mypaybyday.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import lombok.Getter;
import lombok.Setter;
import org.openapitools.jackson.nullable.JsonNullable;

@Getter
@Setter
public class PatchTimePeriodDto {
    private JsonNullable<String> name = JsonNullable.undefined();
    private JsonNullable<LocalDateTime> startDate = JsonNullable.undefined();
    private JsonNullable<LocalDateTime> endDate = JsonNullable.undefined();
    private JsonNullable<List<TimePeriodBudgetDto>> budgets = JsonNullable.undefined();
    private JsonNullable<BigDecimal> savingsPercentageGoal = JsonNullable.undefined();
    private JsonNullable<BigDecimal> budgetLimit = JsonNullable.undefined();
}
