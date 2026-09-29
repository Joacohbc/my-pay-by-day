package com.mypaybyday.validation;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.FinanceLineItemEntity;
import com.mypaybyday.entity.FinanceNodeEntity;
import com.mypaybyday.entity.FinanceTransactionEntity;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.FinanceNodeRepository;

/**
 * Stateless validator for {@link FinanceTransactionEntity} integrity rules.
 *
 * <p>Centralises all cross-cutting validation concerns so that any service that
 * creates or mutates transactions applies the same rules without duplicating code.
 */
@ApplicationScoped
public class TransactionValidator {

	private final FinanceNodeRepository financeNodeRepository;
	private final Messages messages;
	private final DateValidator dateValidator;
	private final CurrencyValidator currencyValidator;

	public TransactionValidator(
			FinanceNodeRepository financeNodeRepository,
			Messages messages,
			DateValidator dateValidator,
			CurrencyValidator currencyValidator) {
		this.financeNodeRepository = financeNodeRepository;
		this.messages = messages;
		this.dateValidator = dateValidator;
		this.currencyValidator = currencyValidator;
	}

	/**
	* Validates the Zero-Sum Rule: the algebraic sum of all line-item amounts must equal 0.
	*
	* @throws BusinessException if the rule is violated or any amount is null
	*/
	public void validateZeroSum(FinanceTransactionEntity transaction) throws BusinessException {
		if (transaction.lineItems == null || transaction.lineItems.isEmpty()) {
			throw messages.reject(MsgKey.TRANSACTION_NO_LINE_ITEMS);
		}

		BigDecimal sum = BigDecimal.ZERO;
		for (FinanceLineItemEntity item : transaction.lineItems) {
			if (item.amount == null) {
				throw messages.reject(MsgKey.TRANSACTION_LINE_ITEM_AMOUNT_NULL);
			}
			sum = sum.add(item.amount);
		}

		if (sum.compareTo(BigDecimal.ZERO) != 0) {
			throw messages.reject(MsgKey.TRANSACTION_ZERO_SUM_VIOLATED, sum);
		}
	}

	/**
	* Validates that every {@link FinanceLineItemEntity} in the transaction is denominated in the
	* same ISO 4217 currency.
	*
	* <p>The system stores no exchange rates: amounts in different currencies are incommensurable,
	* so summing them — which is exactly what the Zero-Sum Rule does — would be meaningless. One
	* currency per transaction is what keeps that rule arithmetically sound.
	*
	* @throws BusinessException if a currency is missing, unknown, or the transaction mixes several
	*/
	public void validateSingleCurrency(FinanceTransactionEntity transaction) throws BusinessException {
		if (transaction.lineItems == null || transaction.lineItems.isEmpty()) {
			throw messages.reject(MsgKey.TRANSACTION_NO_LINE_ITEMS);
		}

		Set<String> currencies = new LinkedHashSet<>();
		for (FinanceLineItemEntity item : transaction.lineItems) {
			item.currency = currencyValidator.validateRequired(item.currency);
			currencies.add(item.currency);
		}

		if (currencies.size() > 1) {
			throw messages.reject(MsgKey.TRANSACTION_MIXED_CURRENCIES, String.join(", ", currencies));
		}
	}

	/**
	* Validates that every {@link FinanceLineItemEntity} references a {@link FinanceNodeEntity} that exists
	* and is not archived (Node Immutability Rule).
	*
	* @throws BusinessException if a node is missing, not found, or archived
	*/
	public void validateNodesExist(FinanceTransactionEntity transaction) throws BusinessException {
		if (transaction.lineItems == null) return;

		Set<Long> requestedNodeIds = new HashSet<>();
		for (FinanceLineItemEntity item : transaction.lineItems) {
			if (item.financeNode == null || item.financeNode.id == null) {
				throw messages.reject(MsgKey.TRANSACTION_LINE_ITEM_NODES_NOT_FOUND);
			}
			requestedNodeIds.add(item.financeNode.id);
		}

		List<FinanceNodeEntity> nodes = financeNodeRepository.list(requestedNodeIds.stream().toList());
		if(nodes.size() != requestedNodeIds.size()) {
			throw messages.reject(MsgKey.TRANSACTION_LINE_ITEM_NODES_NOT_FOUND);
		}

		nodes.stream()
			.filter(node -> node.archived)
			.findFirst()
			.ifPresent(node -> {
				throw messages.reject(MsgKey.NODE_ARCHIVED_IN_USE, node.id);
			});

		validateNodeDenominations(transaction, nodes);
	}

	/**
	* Validates that a line item's currency matches the denomination of the node it moves value
	* through, for every node that declares one.
	*
	* <p>An own account is denominated in exactly one currency, so a line item in any other
	* currency is a recording mistake — a USD charge booked against a UYU account — that no later
	* report could detect, since the two amounts would simply never be added together. Nodes with
	* no declared currency (external entities, contacts) accept any.
	*
	* @throws BusinessException if a line item contradicts its node's denomination
	*/
	private void validateNodeDenominations(FinanceTransactionEntity transaction, List<FinanceNodeEntity> nodes)
			throws BusinessException {
		Map<Long, FinanceNodeEntity> nodesById = new LinkedHashMap<>();
		for (FinanceNodeEntity node : nodes) {
			nodesById.put(node.id, node);
		}

		for (FinanceLineItemEntity item : transaction.lineItems) {
			FinanceNodeEntity node = nodesById.get(item.financeNode.id);
			if (node == null || node.currency == null || item.currency == null) continue;
			if (!node.currency.equalsIgnoreCase(item.currency)) {
				throw messages.reject(MsgKey.CURRENCY_NODE_MISMATCH, node.name, node.currency, item.currency);
			}
		}
	}

	/**
	* Validates that the transaction date is not in the future.
	* The comparison uses the globally configured TimeZone implicitly via LocalDateTime.now().
	*
	* @throws BusinessException if the transaction date is in the future
	*/
	public void validateDateNotInFuture(FinanceTransactionEntity transaction) throws BusinessException {
		dateValidator.validateNotFuture(transaction.transactionDate);
	}

	/**
	 * Orchestrates all transaction integrity validations.
	 *
	 * @throws BusinessException if any validation rule is violated
	 */
	public void validate(FinanceTransactionEntity transaction) throws BusinessException {
		validateSingleCurrency(transaction);
		validateZeroSum(transaction);
		validateNodesExist(transaction);
		validateDateNotInFuture(transaction);
	}
}
