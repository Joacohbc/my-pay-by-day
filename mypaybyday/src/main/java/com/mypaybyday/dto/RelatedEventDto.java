package com.mypaybyday.dto;

import com.mypaybyday.entity.FinanceEvent;
import com.mypaybyday.enums.EventType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * A minimal representation of a related FinanceEvent to avoid infinite recursion
 * when returning an event that has related events.
 */
public record RelatedEventDto(
    Long id,
    String name,
    EventType type,
    BigDecimal amount,
    LocalDateTime transactionDate
) {
    public static RelatedEventDto from(FinanceEvent event) {
        BigDecimal calculatedAmount = BigDecimal.ZERO;
        LocalDateTime txDate = null;

        if (event.transaction != null) {
            txDate = event.transaction.transactionDate;
            if (event.transaction.lineItems != null) {
                calculatedAmount = event.transaction.lineItems.stream()
                        .map(li -> li.amount)
                        .filter(a -> a != null && a.compareTo(BigDecimal.ZERO) > 0)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
            }
        }

        return new RelatedEventDto(
            event.id,
            event.name,
            event.type,
            calculatedAmount,
            txDate
        );
    }
}