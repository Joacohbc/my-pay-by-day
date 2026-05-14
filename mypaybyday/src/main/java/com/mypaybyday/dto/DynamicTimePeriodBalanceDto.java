package com.mypaybyday.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record DynamicTimePeriodBalanceDto(
	LocalDateTime startDate,
	LocalDateTime endDate,
	BigDecimal income,
	BigDecimal outbound,
	List<FinanceEventDto> events
) {
}
