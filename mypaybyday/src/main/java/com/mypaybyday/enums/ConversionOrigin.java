package com.mypaybyday.enums;

/**
 * When the rate stored on a transaction was frozen.
 *
 * <ul>
 * <li>{@link #AT_ENTRY} — the rate in force when the transaction was recorded.</li>
 * <li>{@link #RETROACTIVE} — the transaction predates its target currency becoming principal, so it
 * was converted later, at the rate in force at that later moment.</li>
 * <li>{@link #RECALCULATED} — the user replaced the frozen rate afterwards with one of their choice,
 * through a conversion recalculation.</li>
 * </ul>
 */
public enum ConversionOrigin {
	AT_ENTRY,
	RETROACTIVE,
	RECALCULATED
}
