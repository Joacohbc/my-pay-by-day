package com.mypaybyday.dto;

import com.mypaybyday.entity.TimePeriod;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TimePeriodDto(
        Long id,
        String name,
        LocalDate startDate,
        LocalDate endDate,
        CategoryDto category,
        BigDecimal budgetedAmount,
        BigDecimal savingsPercentageGoal
) {
    public static TimePeriodDto from(TimePeriod tp) {
        return new TimePeriodDto(
                tp.id,
                tp.name,
                tp.startDate,
                tp.endDate,
                tp.category != null ? CategoryDto.from(tp.category) : null,
                tp.budgetedAmount,
                tp.savingsPercentageGoal
        );
    }

    /**
     * Converts this DTO to a {@link TimePeriod} entity with scalar fields populated.
     * The {@code category} association is intentionally left null and must be resolved
     * separately in the service layer via a repository lookup to obtain a managed entity.
     */
    public TimePeriod to() {
        TimePeriod tp = new TimePeriod();
        tp.id = this.id;
        tp.name = this.name;
        tp.startDate = this.startDate;
        tp.endDate = this.endDate;
        tp.budgetedAmount = this.budgetedAmount;
        tp.savingsPercentageGoal = this.savingsPercentageGoal;
        return tp;
    }
}
