package com.mypaybyday.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record DynamicTimePeriodBalanceDto(
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal income,
        BigDecimal outbound,
        List<FinanceEventDto> events
) {
}
