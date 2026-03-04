package com.mypaybyday.service;

import com.mypaybyday.entity.LineItem;
import com.mypaybyday.entity.Transaction;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.repository.FinanceNodeRepository;
import com.mypaybyday.repository.TransactionRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.util.List;

@ApplicationScoped
public class TransactionService {

    @Inject
    TransactionRepository transactionRepository;

    @Inject
    FinanceNodeRepository financeNodeRepository;

    @Inject
    TransactionValidator transactionValidator;

    public List<Transaction> listAll() {
        return transactionRepository.listAll();
    }

    public Transaction findById(Long id) {
        return transactionRepository.findById(id);
    }

    @Transactional
    public Transaction create(Transaction transaction) {
        transactionValidator.validateZeroSum(transaction);
        transactionValidator.validateNodesExist(transaction);

        // Link bidirectional mapping and resolve FinanceNode references
        if (transaction.lineItems != null) {
            for (LineItem item : transaction.lineItems) {
                item.transaction = transaction;
                item.financeNode = financeNodeRepository.findById(item.financeNode.id);
            }
        }

        transactionRepository.persist(transaction);
        return transaction;
    }

    @Transactional
    public Transaction update(Long id, Transaction transactionDetails) {
        transactionValidator.validateZeroSum(transactionDetails);
        transactionValidator.validateNodesExist(transactionDetails);

        Transaction transaction = transactionRepository.findById(id);
        if (transaction == null) {
            throw new BusinessException("Transaction not found");
        }

        transaction.transactionDate = transactionDetails.transactionDate;

        // Clear and add new line items, resolving FinanceNode references
        transaction.lineItems.clear();
        if (transactionDetails.lineItems != null) {
            for (LineItem item : transactionDetails.lineItems) {
                item.transaction = transaction;
                item.financeNode = financeNodeRepository.findById(item.financeNode.id);
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
}
