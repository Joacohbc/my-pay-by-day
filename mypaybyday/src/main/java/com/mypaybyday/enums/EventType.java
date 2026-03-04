package com.mypaybyday.enums;

/**
 * Classifies the directional nature of an {@link com.mypaybyday.entity.Event}.
 *
 * <ul>
 *   <li>{@link #INBOUND} — money flowing into an own account (e.g., salary, refund).</li>
 *   <li>{@link #OUTBOUND} — money flowing out of an own account (e.g., purchase, bill payment).</li>
 *   <li>{@link #OTHER} — internal transfers or movements that are neither pure income nor expense.</li>
 * </ul>
 */
public enum EventType {
    INBOUND,
    OUTBOUND,
    OTHER
}
