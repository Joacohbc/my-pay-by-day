package com.mypaybyday.dto;

import com.mypaybyday.entity.TimePeriod;

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
        BigDecimal savingsPercentageGoal
) {
    public static TimePeriodDto from(TimePeriod tp) {
        return new TimePeriodDto(
                tp.id,
                tp.name,
                tp.startDate,
                tp.endDate,
                tp.budgets != null ? tp.budgets.stream().map(TimePeriodBudgetDto::from).collect(Collectors.toList()) : null,
                tp.savingsPercentageGoal
        );
    }

    /**
     * Converts this DTO to a {@link TimePeriod} entity with scalar fields populated.
     * The budgets association is left empty and should be handled by the service layer.
     */
    public TimePeriod to() {
        TimePeriod tp = new TimePeriod();
        tp.id = this.id;
        tp.name = this.name;
        tp.startDate = this.startDate;
        tp.endDate = this.endDate;
        tp.savingsPercentageGoal = this.savingsPercentageGoal;
        return tp;
    }
}
