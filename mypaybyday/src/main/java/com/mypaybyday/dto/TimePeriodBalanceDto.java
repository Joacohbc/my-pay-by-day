package com.mypaybyday.dto;

import com.mypaybyday.entity.TimePeriod;

import java.math.BigDecimal;
import java.util.List;

/**
 * Read-only projection returned by the "get balance" operation on a {@link TimePeriod}.
 *
 * <ul>
 *   <li>{@code timePeriod}  — the budget container itself.</li>
 *   <li>{@code income}      — sum of positive line-item amounts for all {@code INBOUND} events
 *                            whose transaction date falls within the period.</li>
 *   <li>{@code outbound}    — sum of positive line-item amounts for all {@code OUTBOUND} events
 *                            whose transaction date falls within the period.</li>
 *   <li>{@code events}      — every {@link FinanceEventDto} dynamically associated to the period.</li>
 * </ul>
 */
public record TimePeriodBalanceDto(
        TimePeriod timePeriod,
        BigDecimal income,
        BigDecimal outbound,
        List<FinanceEventDto> events
) {}
