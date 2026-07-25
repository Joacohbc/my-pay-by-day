package com.mypaybyday.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.FinanceNodeBalanceSummaryDto;
import com.mypaybyday.dto.FinanceNodeDto;
import com.mypaybyday.entity.FinanceLineItemEntity;
import com.mypaybyday.entity.FinanceNodeEntity;
import com.mypaybyday.entity.NodeProfile;
import com.mypaybyday.enums.FinanceNodeType;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.FinanceNodeRepository;
import com.mypaybyday.repository.LineItemRepository;
import com.mypaybyday.service.event.TransactionService;
import com.mypaybyday.validation.FinanceNodeValidator;
import io.quarkus.logging.Log;

@ApplicationScoped
public class FinanceNodeService {

	private final FinanceNodeRepository financeNodeRepository;
	private final LineItemRepository lineItemRepository;
	private final Messages messages;
	private final FinanceNodeValidator financeNodeValidator;

	public FinanceNodeService(
			FinanceNodeRepository financeNodeRepository,
			LineItemRepository lineItemRepository,
			Messages messages,
			FinanceNodeValidator financeNodeValidator) {
		this.financeNodeRepository = financeNodeRepository;
		this.lineItemRepository = lineItemRepository;
		this.messages = messages;
		this.financeNodeValidator = financeNodeValidator;
	}

	@Transactional
	public List<FinanceNodeDto> listAll(Boolean archived, FinanceNodeType type) {
		StringBuilder queryBuilder = new StringBuilder();
		List<Object> params = new ArrayList<>();

		if (archived == null || !archived) {
			queryBuilder.append("archived = ?").append(params.size() + 1);
			params.add(false);
		}

		if (type != null) {
			if (queryBuilder.length() > 0) {
				queryBuilder.append(" and ");
			}
			queryBuilder.append("type = ?").append(params.size() + 1);
			params.add(type);
		}

		String query = queryBuilder.toString();
		if (query.isEmpty()) {
			query = "1=1";
		}

		Object[] paramsArray = params.toArray();
		return financeNodeRepository.find(query, paramsArray)
				.stream()
				.map(FinanceNodeDto::from)
				.toList();
	}

	@Transactional
	public FinanceNodeDto findById(Long id) {
		FinanceNodeEntity node = financeNodeRepository.findById(id);
		if (node == null || node.archived) {
			return null;
		}
		return FinanceNodeDto.from(node);
	}

	/**
	* Internal method used by other services that need a managed
	* {@link FinanceNodeEntity} entity
	* (e.g. {@link TransactionService} when resolving node references on line
	* items).
	*/
	FinanceNodeEntity findNodeEntity(Long id) throws BusinessException {
		FinanceNodeEntity node = financeNodeRepository.findById(id);
		if (node == null || node.archived) {
			throw messages.reject(MsgKey.NODE_NOT_FOUND_ARCHIVED, id);
		}
		return node;
	}

	@Transactional
	public FinanceNodeDto create(FinanceNodeDto dto) throws BusinessException {
		FinanceNodeEntity node = new FinanceNodeEntity();
		node.name = dto.name();
		node.type = dto.type();
		node.description = dto.description();
		node.icon = dto.icon();
		node.color = dto.color();
		node.profile = dto.toProfile();

		financeNodeValidator.validate(node);

		financeNodeRepository.persist(node);
		Log.infof("Created finance-node id=%d type=%s", node.id, node.type);
		return FinanceNodeDto.from(node);
	}

	@Transactional
	public FinanceNodeDto update(Long id, FinanceNodeDto dto) throws BusinessException {
		FinanceNodeEntity node = financeNodeRepository.findById(id);
		if (node == null || node.archived) {
			throw messages.reject(MsgKey.NODE_NOT_FOUND_ARCHIVED_GENERIC);
		}
		node.name = dto.name();
		node.type = dto.type();
		node.description = dto.description();
		node.icon = dto.icon();
		node.color = dto.color();
		node.profile = dto.toProfile();

		financeNodeValidator.validate(node);

		Log.infof("Updated finance-node id=%d", id);
		return FinanceNodeDto.from(node);
	}

	@Transactional
	public void archive(Long id) throws BusinessException {
		FinanceNodeEntity node = financeNodeRepository.findById(id);
		if (node == null) {
			throw messages.reject(MsgKey.NODE_NOT_FOUND);
		}

		boolean inUseForRecurring = financeNodeRepository.countInTemplates(node) > 0
				|| financeNodeRepository.countInSubscriptions(node) > 0;

		if (inUseForRecurring) {
			Log.warnf("Archive rejected: finance-node id=%d is in use by templates/subscriptions", id);
			throw messages.reject(MsgKey.NODE_ARCHIVE_IN_USE);
		}

		// It's always allowed to archive, we just don't physically delete
		node.archived = true;
		Log.infof("Archived finance-node id=%d", id);
	}

	@Transactional
	public void unarchive(Long id) throws BusinessException {
		FinanceNodeEntity node = financeNodeRepository.findById(id);
		if (node == null) {
			throw messages.reject(MsgKey.NODE_NOT_FOUND);
		}
		node.archived = false;
		Log.infof("Unarchived finance-node id=%d", id);
	}

	@Transactional
	public void delete(Long id) throws BusinessException {
		FinanceNodeEntity node = financeNodeRepository.findById(id);
		if (node == null) {
			throw messages.reject(MsgKey.NODE_NOT_FOUND);
		}

		boolean inUseForRecurring = financeNodeRepository.countInTemplates(node) > 0
				|| financeNodeRepository.countInSubscriptions(node) > 0;

		if (inUseForRecurring) {
			Log.warnf("Delete rejected: finance-node id=%d is in use by templates/subscriptions", id);
			throw messages.reject(MsgKey.NODE_ARCHIVE_IN_USE);
		}

		long txCount = lineItemRepository.count("financeNode", node);
		if (txCount > 0) {
			Log.warnf("Delete rejected: finance-node id=%d has %d line items", id, txCount);
			throw messages.reject(MsgKey.NODE_HAS_TRANSACTIONS);
		}
		financeNodeRepository.delete(node);
		Log.infof("Deleted finance-node id=%d", id);
	}

	@Transactional
	public BigDecimal calculateBalance(Long id) throws BusinessException {
		FinanceNodeEntity node = financeNodeRepository.findById(id);
		if (node == null) {
			throw messages.reject(MsgKey.NODE_NOT_FOUND);
		}

		// Calculate balance on-the-fly summing all amounts for this node
		// In this logic, positive amounts add to balance, negative decrease.
		// It depends on how transactions are registered (e.g. income is +, expense is -
		// for OWN accounts).
		BigDecimal total = lineItemRepository.find("financeNode", node)
				.stream()
				.map(lineItem -> lineItem.amount)
				.reduce(BigDecimal.ZERO, BigDecimal::add);

		Log.debugf("Calculated balance for finance-node id=%d", id);
		return total;
	}

	/**
	* Summarises everything the node's declared capabilities allow the system to derive.
	*
	* <p>
	* A node without a limit or without a cycle is not an error — the corresponding fields
	* simply come back {@code null}. Every figure is computed on the fly; nothing is stored.
	*/
	@Transactional
	public FinanceNodeBalanceSummaryDto getBalanceSummary(Long id) throws BusinessException {
		FinanceNodeEntity node = financeNodeRepository.findById(id);
		if (node == null) {
			throw messages.reject(MsgKey.NODE_NOT_FOUND);
		}

		NodeProfile profile = node.profile != null ? node.profile : new NodeProfile();
		BigDecimal currentBalance = sumAmounts(lineItemRepository.find("financeNode", node).list());

		BigDecimal remaining = profile.hasLimit() ? computeRemaining(profile.balanceLimit, currentBalance) : null;
		StatementCycle cycle = profile.hasCycle() ? computeCycle(node, profile) : null;

		Log.debugf("Summarised finance-node id=%d remaining=%s cycle=%s", id, remaining, cycle);
		return new FinanceNodeBalanceSummaryDto(
				currentBalance,
				profile.balanceLimit,
				remaining,
				remaining == null ? null : remaining.signum() < 0,
				cycle == null ? null : cycle.closedBalance(),
				cycle == null ? null : cycle.openBalance(),
				cycle == null ? null : cycle.lastClose(),
				cycle == null ? null : cycle.nextClose(),
				cycle == null ? null : cycle.nextSettlement());
	}

	/**
	* Distance from the current balance to the limit, measured in the direction the limit
	* points. A negative result means the limit has been passed.
	*
	* <p>
	* The sign of the limit carries its meaning, which is what lets one field serve both
	* directions: a negative limit is a floor to stay above (a liability such as a credit
	* line), a positive one is a ceiling to climb towards (a savings target). Note this is
	* deliberately not {@code limit - abs(balance)}, which would misreport a node whose
	* balance sits on the opposite side of zero from its limit.
	*/
	private BigDecimal computeRemaining(BigDecimal balanceLimit, BigDecimal currentBalance) {
		boolean isFloor = balanceLimit.signum() < 0;
		return isFloor ? currentBalance.subtract(balanceLimit) : balanceLimit.subtract(currentBalance);
	}

	private StatementCycle computeCycle(FinanceNodeEntity node, NodeProfile profile) {
		LocalDate today = LocalDate.now();
		LocalDate lastClose = mostRecentDayOnOrBefore(today, profile.cycleDay);
		LocalDate nextClose = lastClose.plusMonths(1);
		LocalDate nextSettlement = firstDayStrictlyAfter(lastClose, profile.settlementDay);

		BigDecimal closedBalance = sumAmounts(lineItemRepository.findByNodeUpTo(node, lastClose.atTime(LocalTime.MAX)));
		BigDecimal openBalance = sumAmounts(lineItemRepository.findByNodeBetween(
				node, lastClose.atTime(LocalTime.MAX), nextClose.atTime(LocalTime.MAX)));

		return new StatementCycle(lastClose, nextClose, nextSettlement, closedBalance.negate(), openBalance.negate());
	}

	private LocalDate mostRecentDayOnOrBefore(LocalDate reference, int dayOfMonth) {
		LocalDate candidate = reference.withDayOfMonth(dayOfMonth);
		return candidate.isAfter(reference) ? candidate.minusMonths(1) : candidate;
	}

	private LocalDate firstDayStrictlyAfter(LocalDate reference, int dayOfMonth) {
		LocalDate candidate = reference.withDayOfMonth(dayOfMonth);
		return candidate.isAfter(reference) ? candidate : candidate.plusMonths(1);
	}

	/**
	* Amounts are encrypted at rest, so they cannot be aggregated in SQL and are summed
	* here instead.
	*/
	private BigDecimal sumAmounts(List<FinanceLineItemEntity> lineItems) {
		return lineItems.stream()
				.map(lineItem -> lineItem.amount)
				.reduce(BigDecimal.ZERO, BigDecimal::add);
	}

	/**
	* The dates and figures of the node's current cycle, kept together so the summary is
	* assembled from one coherent snapshot.
	*
	* <p>
	* Balances are stored sign-flipped relative to the ledger so that an outstanding debt
	* reads as a positive amount owed, which is how a settlement is presented.
	*/
	private record StatementCycle(
			LocalDate lastClose,
			LocalDate nextClose,
			LocalDate nextSettlement,
			BigDecimal closedBalance,
			BigDecimal openBalance) {
	}
}
