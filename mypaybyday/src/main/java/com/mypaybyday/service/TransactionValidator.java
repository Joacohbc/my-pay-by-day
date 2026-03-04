package com.mypaybyday.service;

import com.mypaybyday.entity.FinanceNode;
import com.mypaybyday.entity.FinanceLineItem;
import com.mypaybyday.entity.FinanceTransaction;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.repository.FinanceNodeRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.math.BigDecimal;

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

    /**
     * Validates the Zero-Sum Rule: the algebraic sum of all line-item amounts must equal 0.
     *
     * @throws BusinessException if the rule is violated or any amount is null
     */
    public void validateZeroSum(FinanceTransaction transaction) throws BusinessException {
        if (transaction.lineItems == null || transaction.lineItems.isEmpty()) {
            throw new BusinessException("Transaction must have at least one line item");
        }

        BigDecimal sum = BigDecimal.ZERO;
        for (FinanceLineItem item : transaction.lineItems) {
            if (item.amount == null) {
                throw new BusinessException("Line item amount cannot be null");
            }
            sum = sum.add(item.amount);
        }

        if (sum.compareTo(BigDecimal.ZERO) != 0) {
            throw new BusinessException(
                    "Zero-sum rule violated: the sum of all line item amounts must be 0. Current sum: " + sum);
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
        for (FinanceLineItem item : transaction.lineItems) {
            if (item.financeNode == null || item.financeNode.id == null) {
                throw new BusinessException("Each line item must reference a FinanceNode");
            }
            FinanceNode node = financeNodeRepository.findById(item.financeNode.id);
            if (node == null) {
                throw new BusinessException("FinanceNode not found: " + item.financeNode.id);
            }
            if (node.archived) {
                throw new BusinessException(
                        "FinanceNode is archived and cannot be used: " + item.financeNode.id);
            }
        }
    }
}
