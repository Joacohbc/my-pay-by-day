package com.mypaybyday.dto;

import java.math.BigDecimal;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import com.mypaybyday.entity.FinanceLineItemEntity;

public record FinanceLineItemDto(
	@Schema(nullable = true) Long financeNodeId,
	@Schema(nullable = true) String financeNodeName,
	@Schema(nullable = true) String financeNodeIcon,
	BigDecimal amount
) {

    public static FinanceLineItemDto from(FinanceLineItemEntity item) {
	return new FinanceLineItemDto(
		item.financeNode != null ? item.financeNode.id : null,
		item.financeNode != null ? item.financeNode.name : null,
		item.financeNode != null ? item.financeNode.icon : null,
		item.amount
	);
    }
}
