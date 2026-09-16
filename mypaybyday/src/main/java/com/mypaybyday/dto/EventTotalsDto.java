package com.mypaybyday.dto;

import java.util.List;

/**
 * Aggregate totals for every {@link com.mypaybyday.entity.FinanceEventEntity} matching an
 * {@link EventQuery}'s filters, independent of pagination.
 *
 * <p>Mirrors the aggregation performed by
 * {@link com.mypaybyday.service.TimePeriodService#getBalance}, but over an arbitrary filter set
 * instead of a fixed date range, so a filtered event list and its own totals never disagree.
 *
 * <ul>
 * <li>{@code totals} — one {@link CurrencyTotalsDto} per currency in the match set. Amounts of
 * different currencies are reported separately and never summed together.</li>
 * <li>{@code totalElements} — count of events in the match set, across all currencies.</li>
 * </ul>
 */
public record EventTotalsDto(
		List<CurrencyTotalsDto> totals,
		long totalElements) {
}
