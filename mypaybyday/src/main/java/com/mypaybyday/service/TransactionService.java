package com.mypaybyday.service;

import com.mypaybyday.entity.LineItem;
import com.mypaybyday.entity.Transaction;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.repository.TransactionRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.math.BigDecimal;
import java.util.List;

@ApplicationScoped
public class TransactionService {

    @Inject
    TransactionRepository transactionRepository;

    public List<Transaction> listAll() {
        return transactionRepository.listAll();
    }

    public Transaction findById(Long id) {
        return transactionRepository.findById(id);
    }

    @Transactional
    public Transaction create(Transaction transaction) {
        validateZeroSum(transaction);

        // Link bidirectional mapping
        if (transaction.lineItems != null) {
            for (LineItem item : transaction.lineItems) {
                item.transaction = transaction;
            }
        }

        transactionRepository.persist(transaction);
        return transaction;
    }

    @Transactional
    public Transaction update(Long id, Transaction transactionDetails) {
        validateZeroSum(transactionDetails);

        Transaction transaction = transactionRepository.findById(id);
        if (transaction == null) {
            throw new BusinessException("Transaction not found");
        }

        transaction.transactionDate = transactionDetails.transactionDate;

        // Clear and add new line items for simplicity in updates, or update manually
        transaction.lineItems.clear();
        if (transactionDetails.lineItems != null) {
            for (LineItem item : transactionDetails.lineItems) {
                item.transaction = transaction;
                transaction.lineItems.add(item);
            }
        }

        return transaction;
    }

    @Transactional
    public void delete(Long id) {
        Transaction transaction = transactionRepository.findById(id);
        if (transaction == null) {
            throw new BusinessException("Transaction not found");
        }
        transactionRepository.delete(transaction);
    }

    private void validateZeroSum(Transaction transaction) {
        if (transaction.lineItems == null || transaction.lineItems.isEmpty()) {
            throw new BusinessException("Transaction must have at least one line item");
        }

        BigDecimal sum = BigDecimal.ZERO;
        for (LineItem item : transaction.lineItems) {
            if (item.amount == null) {
                throw new BusinessException("Line item amount cannot be null");
            }
            sum = sum.add(item.amount);
        }

        if (sum.compareTo(BigDecimal.ZERO) != 0) {
            throw new BusinessException("Zero-sum rule violated: The sum of all line item amounts must be 0");
        }
    }
}
