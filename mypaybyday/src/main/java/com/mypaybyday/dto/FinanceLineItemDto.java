package com.mypaybyday.dto;

import java.math.BigDecimal;

import com.mypaybyday.entity.FinanceLineItemEntity;

public record FinanceLineItemDto(
	Long financeNodeId,
	String financeNodeName,
	String financeNodeIcon,
	String financeNodeColor,
	BigDecimal amount
) {

    public static FinanceLineItemDto from(FinanceLineItemEntity item) {
	return new FinanceLineItemDto(
		item.financeNode != null ? item.financeNode.id : null,
		item.financeNode != null ? item.financeNode.name : null,
		item.financeNode != null ? item.financeNode.icon : null,
		item.financeNode != null ? item.financeNode.color : null,
		item.amount
	);
    }
}
