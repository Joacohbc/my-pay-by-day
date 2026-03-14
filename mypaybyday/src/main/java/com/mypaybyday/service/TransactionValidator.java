package com.mypaybyday.service;

import com.mypaybyday.entity.FinanceNode;
import com.mypaybyday.entity.FinanceLineItem;
import com.mypaybyday.entity.FinanceTransaction;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.FinanceNodeRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Stateless validator for {@link FinanceTransaction} integrity rules.
 *
 * <p>Centralises all cross-cutting validation concerns so that any service that
 * creates or mutates transactions applies the same rules without duplicating code.
 */
@ApplicationScoped
public class TransactionValidator {

    @Inject
    FinanceNodeRepository financeNodeRepository;

    @Inject
    Messages messages;

    /**
     * Validates the Zero-Sum Rule: the algebraic sum of all line-item amounts must equal 0.
     *
     * @throws BusinessException if the rule is violated or any amount is null
     */
    public void validateZeroSum(FinanceTransaction transaction) throws BusinessException {
        if (transaction.lineItems == null || transaction.lineItems.isEmpty()) {
            throw new BusinessException(messages.get(MsgKey.TRANSACTION_NO_LINE_ITEMS));
        }

        BigDecimal sum = BigDecimal.ZERO;
        for (FinanceLineItem item : transaction.lineItems) {
            if (item.amount == null) {
                throw new BusinessException(messages.get(MsgKey.TRANSACTION_LINE_ITEM_AMOUNT_NULL));
            }
            sum = sum.add(item.amount);
        }

        if (sum.compareTo(BigDecimal.ZERO) != 0) {
            throw new BusinessException(messages.get(MsgKey.TRANSACTION_ZERO_SUM_VIOLATED, sum));
        }
    }

    /**
     * Validates that every {@link FinanceLineItem} references a {@link FinanceNode} that exists
     * and is not archived (Node Immutability Rule).
     *
     * @throws BusinessException if a node is missing, not found, or archived
     */
    public void validateNodesExist(FinanceTransaction transaction) throws BusinessException {
        if (transaction.lineItems == null) return;

        List<Long> ids = transaction.lineItems.stream()
            .map(item -> item.financeNode != null ? item.financeNode.id : null)
            .toList();

        List<FinanceNode> nodes = financeNodeRepository.list(ids);
        if(nodes.size() != ids.size()) {
            throw new BusinessException(messages.get(MsgKey.TRANSACTION_LINE_ITEM_NODES_NOT_FOUND));
        }

        nodes.stream()
            .filter(node -> node.archived)
            .findFirst()
            .ifPresent(node -> {
                throw new BusinessException(messages.get(MsgKey.NODE_ARCHIVED_IN_USE, node.id));
            });
    }

    /**
     * Validates that the transaction date is not in the future.
     * The comparison uses the globally configured TimeZone implicitly via LocalDateTime.now().
     *
     * @throws BusinessException if the transaction date is in the future
     */
    public void validateDateNotInFuture(FinanceTransaction transaction) throws BusinessException {
        if (transaction.transactionDate != null && transaction.transactionDate.isAfter(LocalDateTime.now())) {
            throw new BusinessException(messages.get(MsgKey.TRANSACTION_DATE_IN_FUTURE));
        }
    }
}
