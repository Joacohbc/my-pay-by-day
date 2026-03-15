package com.mypaybyday.dto;

import com.mypaybyday.entity.FinanceTransaction;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record FinanceTransactionDto(
        Long id,
        LocalDate transactionDate,
        Instant createdAt,
        Instant updatedAt,
        List<FinanceLineItemDto> lineItems
) {
    public static FinanceTransactionDto from(FinanceTransaction tx) {
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
