package com.mypaybyday.service;

import com.mypaybyday.dto.FinanceTransactionDto;
import com.mypaybyday.entity.FinanceLineItem;
import com.mypaybyday.entity.FinanceTransaction;
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

    public List<FinanceTransactionDto> listAll() {
        return transactionRepository.listAll().stream().map(FinanceTransactionDto::from).toList();
    }

    public FinanceTransactionDto findById(Long id) throws BusinessException {
        FinanceTransaction transaction = transactionRepository.findById(id);
        if (transaction == null) {
            throw new BusinessException("Transaction not found");
        }
        return FinanceTransactionDto.from(transaction);
    }

    @Transactional
    FinanceTransaction create(FinanceTransaction transaction) throws BusinessException {
        transactionValidator.validateZeroSum(transaction);
        transactionValidator.validateNodesExist(transaction);

        // Link bidirectional mapping and resolve FinanceNode references
        if (transaction.lineItems != null) {
            for (FinanceLineItem item : transaction.lineItems) {
                item.transaction = transaction;
                item.financeNode = financeNodeRepository.findById(item.financeNode.id);
            }
        }

        transactionRepository.persist(transaction);
        return transaction;
    }

    @Transactional
    FinanceTransaction update(Long id, FinanceTransaction transactionDetails) throws BusinessException {
        transactionValidator.validateZeroSum(transactionDetails);
        transactionValidator.validateNodesExist(transactionDetails);

        FinanceTransaction transaction = transactionRepository.findById(id);
        if (transaction == null) {
            throw new BusinessException("Transaction not found");
        }

        transaction.transactionDate = transactionDetails.transactionDate;

        // Clear and add new line items, resolving FinanceNode references
        transaction.lineItems.clear();
        if (transactionDetails.lineItems != null) {
            for (FinanceLineItem item : transactionDetails.lineItems) {
                item.transaction = transaction;
                item.financeNode = financeNodeRepository.findById(item.financeNode.id);
                transaction.lineItems.add(item);
            }
        }

        return transaction;
    }

    @Transactional
    public void delete(Long id) throws BusinessException {
        FinanceTransaction transaction = transactionRepository.findById(id);
        if (transaction == null) {
            throw new BusinessException("Transaction not found");
        }
        transactionRepository.delete(transaction);
    }
}
