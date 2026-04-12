package com.mypaybyday.dto;

import java.math.BigDecimal;

import com.mypaybyday.entity.FinanceLineItemEntity;

public record FinanceLineItemDto(
	Long financeNodeId,
	String financeNodeName,
	BigDecimal amount
) {

    public static FinanceLineItemDto from(FinanceLineItemEntity item) {
	return new FinanceLineItemDto(
		item.financeNode != null ? item.financeNode.id : null,
		item.financeNode != null ? item.financeNode.name : null,
		item.amount
	);
    }
}
