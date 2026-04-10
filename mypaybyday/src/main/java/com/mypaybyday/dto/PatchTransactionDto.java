package com.mypaybyday.dto;

import com.mypaybyday.entity.FinanceLineItem;
import com.mypaybyday.entity.FinanceNode;
import com.mypaybyday.entity.FinanceTransaction;

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

        public FinanceLineItem toEntity() {
            FinanceLineItem item = new FinanceLineItem();
            item.amount = this.amount;
            if (this.financeNode != null) {
                FinanceNode node = new FinanceNode();
                node.id = this.financeNode.id();
                item.financeNode = node;
            }
            return item;
        }
    }

    public FinanceTransaction toEntity() {
        FinanceTransaction tx = new FinanceTransaction();
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
