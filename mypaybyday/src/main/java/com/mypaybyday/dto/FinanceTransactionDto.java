package com.mypaybyday.dto;

import com.mypaybyday.entity.FinanceTransactionEntity;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

public record FinanceTransactionDto(
        Long id,
        LocalDateTime transactionDate,
        Instant createdAt,
        Instant updatedAt,
        List<FinanceLineItemDto> lineItems
) {
    public static FinanceTransactionDto from(FinanceTransactionEntity tx) {
        return new FinanceTransactionDto(
                tx.id,
                tx.transactionDate,
                tx.createdAt,
                tx.updatedAt,
                tx.lineItems != null
                        ? tx.lineItems.stream().map(FinanceLineItemDto::from).toList()
                        : List.of()
        );
    }
}
