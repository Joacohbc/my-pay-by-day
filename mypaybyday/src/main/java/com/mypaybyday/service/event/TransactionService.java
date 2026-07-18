package com.mypaybyday.service.event;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.FinanceTransactionDto;
import com.mypaybyday.entity.FinanceLineItemEntity;
import com.mypaybyday.entity.FinanceTransactionEntity;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.FinanceNodeRepository;
import com.mypaybyday.repository.TransactionRepository;
import com.mypaybyday.validation.TransactionValidator;
import io.quarkus.logging.Log;

@ApplicationScoped
public class TransactionService {

	private final TransactionRepository transactionRepository;
	private final FinanceNodeRepository financeNodeRepository;
	private final TransactionValidator transactionValidator;
	private final Messages messages;

	public TransactionService(
			TransactionRepository transactionRepository,
			FinanceNodeRepository financeNodeRepository,
			TransactionValidator transactionValidator,
			Messages messages) {
		this.transactionRepository = transactionRepository;
		this.financeNodeRepository = financeNodeRepository;
		this.transactionValidator = transactionValidator;
		this.messages = messages;
	}

	@Transactional
	public List<FinanceTransactionDto> listAll() {
		return transactionRepository.listAll().stream().map(FinanceTransactionDto::from).toList();
	}

	@Transactional
	public FinanceTransactionDto findById(Long id) throws BusinessException {
		FinanceTransactionEntity transaction = transactionRepository.findById(id);
		if (transaction == null) {
			throw new BusinessException(messages.get(MsgKey.TRANSACTION_NOT_FOUND));
		}
		return FinanceTransactionDto.from(transaction);
	}

	@Transactional
	FinanceTransactionEntity create(FinanceTransactionEntity transaction) throws BusinessException {
		transactionValidator.validate(transaction);

		// Link bidirectional mapping and resolve FinanceNodeEntity references
		if (transaction.lineItems != null) {
			for (FinanceLineItemEntity item : transaction.lineItems) {
				item.transaction = transaction;
				item.financeNode = financeNodeRepository.findById(item.financeNode.id);
			}
		}

		transactionRepository.persist(transaction);
		Log.debugf("Created transaction id=%d", transaction.id);
		return transaction;
	}

	@Transactional
	FinanceTransactionEntity update(Long id, FinanceTransactionEntity transactionDetails) throws BusinessException {
		transactionValidator.validate(transactionDetails);

		FinanceTransactionEntity transaction = transactionRepository.findById(id);
		if (transaction == null) {
			throw new BusinessException(messages.get(MsgKey.TRANSACTION_NOT_FOUND));
		}

		transaction.transactionDate = transactionDetails.transactionDate;

		// Clear and add new line items, resolving FinanceNodeEntity references
		transaction.lineItems.clear();
		if (transactionDetails.lineItems != null) {
			for (FinanceLineItemEntity item : transactionDetails.lineItems) {
				item.transaction = transaction;
				item.financeNode = financeNodeRepository.findById(item.financeNode.id);
				transaction.lineItems.add(item);
			}
		}

		Log.debugf("Updated transaction id=%d", transaction.id);
		return transaction;
	}

	@Transactional
	public void delete(Long id) throws BusinessException {
		FinanceTransactionEntity transaction = transactionRepository.findById(id);
		if (transaction == null) {
			throw new BusinessException(messages.get(MsgKey.TRANSACTION_NOT_FOUND));
		}
		transactionRepository.delete(transaction);
		Log.infof("Deleted transaction id=%d", id);
	}
}
