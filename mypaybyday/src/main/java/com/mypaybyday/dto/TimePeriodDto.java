package com.mypaybyday.dto;

import com.mypaybyday.entity.TimePeriodEntity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

public record TimePeriodDto(
        Long id,
        String name,
        LocalDate startDate,
        LocalDate endDate,
        List<TimePeriodBudgetDto> budgets,
        BigDecimal savingsPercentageGoal,
        BigDecimal budgetLimit
) {
    public static TimePeriodDto from(TimePeriodEntity tp) {
        return new TimePeriodDto(
                tp.id,
                tp.name,
                tp.startDate,
                tp.endDate,
                tp.budgets != null ? tp.budgets.stream().map(TimePeriodBudgetDto::from).collect(Collectors.toList()) : null,
                tp.savingsPercentageGoal,
                tp.budgetLimit
        );
    }

    /**
     * Converts this DTO to a {@link TimePeriodEntity} entity with scalar fields populated.
     * The budgets association is left empty and should be handled by the service layer.
     */
    public TimePeriodEntity to() {
        TimePeriodEntity tp = new TimePeriodEntity();
        tp.id = this.id;
        tp.name = this.name;
        tp.startDate = this.startDate;
        tp.endDate = this.endDate;
        tp.savingsPercentageGoal = this.savingsPercentageGoal;
        tp.budgetLimit = this.budgetLimit;
        return tp;
    }
}
