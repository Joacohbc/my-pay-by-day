package com.mypaybyday.dto;

import com.mypaybyday.entity.FinanceLineItemEntity;
import com.mypaybyday.entity.FinanceNodeEntity;
import com.mypaybyday.entity.FinanceTransactionEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public record PatchTransactionDto(
		LocalDateTime transactionDate,
		List<LineItemDto> lineItems
) {

	public record LineItemDto(
			FinanceNodeRef financeNode,
			BigDecimal amount
	) {
		public record FinanceNodeRef(Long id) {}

		public FinanceLineItemEntity toEntity() {
			FinanceLineItemEntity item = new FinanceLineItemEntity();
			item.amount = this.amount;
			if (this.financeNode != null) {
				FinanceNodeEntity node = new FinanceNodeEntity();
				node.id = this.financeNode.id();
				item.financeNode = node;
			}
			return item;
		}
	}


	public FinanceTransactionEntity toEntity() {
		FinanceTransactionEntity tx = new FinanceTransactionEntity();
		tx.transactionDate = this.transactionDate;
		if (this.lineItems != null) {
			tx.lineItems = new ArrayList<>();
			for (LineItemDto li : this.lineItems) {
				tx.lineItems.add(li.toEntity());
			}
		}
		return tx;
	}
}
