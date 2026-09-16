package com.mypaybyday.dto;

import java.time.LocalDateTime;
import java.util.List;

public record DynamicTimePeriodBalanceDto(
	LocalDateTime startDate,
	LocalDateTime endDate,
	List<CurrencyBalanceDto> balances,
	List<FinanceEventDto> events
) {
}
