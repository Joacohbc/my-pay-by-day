package com.mypaybyday.dto;

import com.mypaybyday.entity.FinanceEvent;
import com.mypaybyday.entity.FinanceLineItem;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record RelatedEventDto(
        Long id,
        String name,
        LocalDateTime date,
        BigDecimal amount
) {
    public static RelatedEventDto from(FinanceEvent event) {
        LocalDateTime txDate = null;
        BigDecimal calculatedAmount = BigDecimal.ZERO;

        if (event.transaction != null) {
            txDate = event.transaction.transactionDate;
            if (event.transaction.lineItems != null) {
                calculatedAmount = event.transaction.lineItems.stream()
                        .map(li -> li.amount)
                        .filter(a -> a != null && a.compareTo(BigDecimal.ZERO) > 0)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
            }
        }

        return new RelatedEventDto(event.id, event.name, txDate, calculatedAmount);
    }
}
