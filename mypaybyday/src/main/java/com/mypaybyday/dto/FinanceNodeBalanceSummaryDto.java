package com.mypaybyday.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.mypaybyday.entity.FinanceNodeEntity;
import com.mypaybyday.entity.NodeProfile;

/**
 * Derived view of a {@link FinanceNodeEntity}'s balance, including whatever its
 * {@link NodeProfile} capabilities allow the system to compute.
 *
 * <p>
 * Every figure is calculated on the fly from the node's line items — nothing here is
 * persisted. Fields belonging to a capability the node does not declare come back as
 * {@code null}, which is why this is never an error case: any node can be summarised,
 * it just yields fewer numbers.
 *
 * <p>
 * The names are deliberately neutral. {@code remaining} reads as "available credit" on
 * a node used as a credit card and as "left to save" on one used as a savings target;
 * that interpretation belongs to the presentation layer, not here.
 *
 * @param currentBalance     signed sum of every line item on the node, regardless of date
 * @param balanceLimit       the node's declared limit, or {@code null}
 * @param remaining          distance from {@code currentBalance} to {@code balanceLimit},
 *                           measured in the direction the limit points. Negative means the
 *                           limit has been passed. {@code null} without a limit
 * @param limitExceeded      whether {@code remaining} fell below zero, or {@code null}
 *                           without a limit
 * @param closedCycleBalance balance accumulated up to and including {@code lastCycleClose},
 *                           sign-flipped so a debt reads positive. {@code null} without a cycle
 * @param openCycleBalance   balance accumulated inside the open cycle, sign-flipped the same
 *                           way. {@code null} without a cycle
 * @param lastCycleClose     most recent cycle close on or before today, or {@code null}
 * @param nextCycleClose     next cycle close after {@code lastCycleClose}, or {@code null}
 * @param nextSettlement     first settlement day after {@code lastCycleClose}, or {@code null}
 */
public record FinanceNodeBalanceSummaryDto(
		BigDecimal currentBalance,
		BigDecimal balanceLimit,
		BigDecimal remaining,
		Boolean limitExceeded,
		BigDecimal closedCycleBalance,
		BigDecimal openCycleBalance,
		LocalDate lastCycleClose,
		LocalDate nextCycleClose,
		LocalDate nextSettlement
) {
}
