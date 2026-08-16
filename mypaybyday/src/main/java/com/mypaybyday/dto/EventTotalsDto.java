package com.mypaybyday.dto;

import java.math.BigDecimal;

/**
 * Aggregate totals for every {@link com.mypaybyday.entity.FinanceEventEntity} matching an
 * {@link EventQuery}'s filters, independent of pagination.
 *
 * <p>Mirrors the aggregation performed by
 * {@link com.mypaybyday.service.TimePeriodService#getBalance}, but over an arbitrary filter set
 * instead of a fixed date range, so a filtered event list and its own totals never disagree.
 *
 * <ul>
 * <li>{@code income} — sum of positive line-item amounts across all {@code INBOUND} events in
 * the match set.</li>
 * <li>{@code outbound} — sum of positive line-item amounts across all {@code OUTBOUND} events in
 * the match set.</li>
 * <li>{@code transfers} — sum, across all {@code OTHER} events, of half the sum of absolute
 * line-item amounts (the amount actually moved, per the Zero-Sum Rule).</li>
 * <li>{@code totalElements} — count of events in the match set.</li>
 * </ul>
 */
public record EventTotalsDto(
		BigDecimal income,
		BigDecimal outbound,
		BigDecimal transfers,
		long totalElements) {
}
