package com.mypaybyday.dto;

import java.math.BigDecimal;
import java.util.List;

import com.mypaybyday.entity.TimePeriodEntity;

/**
 * Read-only projection returned by the "get balance" operation on a
 * {@link com.mypaybyday.entity.TimePeriodEntity}.
 *
 * <ul>
 * <li>{@code timePeriod} — the budget container itself.</li>
 * <li>{@code income} — sum of positive line-item amounts for all
 * {@code INBOUND} events
 * whose transaction date falls within the period.</li>
 * <li>{@code outbound} — sum of positive line-item amounts for all
 * {@code OUTBOUND} events
 * whose transaction date falls within the period.</li>
 * <li>{@code events} — every {@link FinanceEventDto} dynamically associated to
 * the period.</li>
 * </ul>
 */
public record TimePeriodBalanceDto(
		TimePeriodDto timePeriod,
		BigDecimal income,
		BigDecimal outbound,
		List<CategoryBudgetSummaryDto> categoryBudgets,
		List<FinanceEventDto> events) {

	public TimePeriodBalanceDto(TimePeriodEntity tp, BigDecimal income, BigDecimal outbound,
			List<CategoryBudgetSummaryDto> categoryBudgets,
			List<FinanceEventDto> events) {
		this(TimePeriodDto.from(tp), income, outbound, categoryBudgets, events);
	}
}
