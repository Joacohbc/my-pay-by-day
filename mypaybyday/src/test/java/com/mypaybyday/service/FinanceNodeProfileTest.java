package com.mypaybyday.service;

import java.math.BigDecimal;

import jakarta.inject.Inject;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import com.mypaybyday.dto.FinanceNodeBalanceSummaryDto;
import com.mypaybyday.dto.FinanceNodeDto;
import com.mypaybyday.enums.FinanceNodeType;
import com.mypaybyday.exception.BusinessException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Covers the {@code NodeProfile} embeddable end to end through the service layer.
 *
 * <p>
 * The round-trip assertions are load-bearing: {@code database.generation=none} means
 * Hibernate never checks the entity mapping against the schema, so a mismatch between the
 * column names the embeddable expects and those created by the Flyway migration would
 * otherwise surface only at runtime. Persisting and re-reading a profile is what proves
 * the mapping.
 */
@QuarkusTest
class FinanceNodeProfileTest {

    private static final BigDecimal CREDIT_LINE_FLOOR = new BigDecimal("-100000");
    private static final BigDecimal SAVINGS_TARGET_CEILING = new BigDecimal("50000");

    @Inject
    FinanceNodeService financeNodeService;

    private FinanceNodeDto createNode(String name, BigDecimal balanceLimit, Integer cycleDay, Integer settlementDay) {
        return financeNodeService.create(new FinanceNodeDto(
                null, name, FinanceNodeType.OWN, null, null, null, false, balanceLimit, cycleDay, settlementDay));
    }

    @Test
    void profileRoundTripsThroughThePersistedColumns() {
        FinanceNodeDto created = createNode("Node with limit and cycle", CREDIT_LINE_FLOOR, 25, 10);

        FinanceNodeDto reloaded = financeNodeService.findById(created.id());

        assertEquals(0, CREDIT_LINE_FLOOR.compareTo(reloaded.balanceLimit()));
        assertEquals(25, reloaded.cycleDay());
        assertEquals(10, reloaded.settlementDay());
    }

    @Test
    void nodeWithoutAnyCapabilityStaysUsable() {
        FinanceNodeDto created = createNode("Plain node", null, null, null);

        FinanceNodeDto reloaded = financeNodeService.findById(created.id());
        assertNull(reloaded.balanceLimit());
        assertNull(reloaded.cycleDay());

        FinanceNodeBalanceSummaryDto summary = financeNodeService.getBalanceSummary(created.id());
        assertEquals(0, BigDecimal.ZERO.compareTo(summary.currentBalance()));
        assertNull(summary.remaining());
        assertNull(summary.limitExceeded());
        assertNull(summary.lastCycleClose());
        assertNull(summary.openCycleBalance());
    }

    @Test
    void remainingCountsUpFromAFloorLimit() {
        FinanceNodeDto created = createNode("Liability node", CREDIT_LINE_FLOOR, null, null);

        FinanceNodeBalanceSummaryDto summary = financeNodeService.getBalanceSummary(created.id());

        assertEquals(0, new BigDecimal("100000").compareTo(summary.remaining()));
        assertFalse(summary.limitExceeded());
    }

    @Test
    void remainingCountsDownTowardsACeilingLimit() {
        FinanceNodeDto created = createNode("Savings node", SAVINGS_TARGET_CEILING, null, null);

        FinanceNodeBalanceSummaryDto summary = financeNodeService.getBalanceSummary(created.id());

        assertEquals(0, SAVINGS_TARGET_CEILING.compareTo(summary.remaining()));
        assertFalse(summary.limitExceeded());
    }

    @Test
    void cycleDatesAreDerivedAroundTheClosingDay() {
        FinanceNodeDto created = createNode("Cycling node", null, 25, 10);

        FinanceNodeBalanceSummaryDto summary = financeNodeService.getBalanceSummary(created.id());

        assertEquals(25, summary.lastCycleClose().getDayOfMonth());
        assertEquals(25, summary.nextCycleClose().getDayOfMonth());
        assertTrue(summary.nextCycleClose().isAfter(summary.lastCycleClose()));
        assertEquals(10, summary.nextSettlement().getDayOfMonth());
        assertTrue(summary.nextSettlement().isAfter(summary.lastCycleClose()));
    }

    @Test
    void aZeroLimitIsRejected() {
        assertThrows(BusinessException.class, () -> createNode("Zero limit", BigDecimal.ZERO, null, null));
    }

    @Test
    void aHalfConfiguredCycleIsRejected() {
        assertThrows(BusinessException.class, () -> createNode("Closing day only", null, 25, null));
        assertThrows(BusinessException.class, () -> createNode("Settlement day only", null, null, 10));
    }

    @Test
    void aDayOutsideEveryMonthIsRejected() {
        assertThrows(BusinessException.class, () -> createNode("Day 31", null, 31, 10));
    }
}
