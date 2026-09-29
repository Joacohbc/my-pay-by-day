package com.mypaybyday.dto;

import java.util.List;

import com.mypaybyday.entity.TimePeriodEntity;

/**
 * Read-only projection returned by the "get balance" operation on a
 * {@link com.mypaybyday.entity.TimePeriodEntity}.
 *
 * <ul>
 * <li>{@code timePeriod} — the budget container itself.</li>
 * <li>{@code balances} — one {@link CurrencyBalanceDto} per currency present in the period,
 * ordered by descending activity. Amounts are never converted between them.</li>
 * <li>{@code events} — every {@link FinanceEventDto} dynamically associated to the period.</li>
 * </ul>
 */
public record TimePeriodBalanceDto(
		TimePeriodDto timePeriod,
		List<CurrencyBalanceDto> balances,
		List<FinanceEventDto> events) {

	public TimePeriodBalanceDto(TimePeriodEntity tp, List<CurrencyBalanceDto> balances,
			List<FinanceEventDto> events) {
		this(TimePeriodDto.from(tp), balances, events);
	}
}
