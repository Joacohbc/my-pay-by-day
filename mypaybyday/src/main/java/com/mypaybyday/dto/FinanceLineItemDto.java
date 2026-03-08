package com.mypaybyday.dto;

import com.mypaybyday.entity.FinanceLineItem;

import java.math.BigDecimal;

public record FinanceLineItemDto(
        Long id,
        Long financeNodeId,
        String financeNodeName,
        BigDecimal amount
) {
    public static FinanceLineItemDto from(FinanceLineItem item) {
        return new FinanceLineItemDto(
                item.id,
                item.financeNode != null ? item.financeNode.id : null,
                item.financeNode != null ? item.financeNode.name : null,
                item.amount
        );
    }
}
