package com.mypaybyday.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.FinanceNodeDto;
import com.mypaybyday.entity.FinanceNodeEntity;
import com.mypaybyday.enums.FinanceNodeType;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.FinanceNodeRepository;
import com.mypaybyday.repository.LineItemRepository;
import com.mypaybyday.service.event.TransactionService;
import com.mypaybyday.validation.FinanceNodeValidator;

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
			throw new BusinessException(messages.get(MsgKey.NODE_NOT_FOUND_ARCHIVED, id));
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

		financeNodeValidator.validate(node);

		financeNodeRepository.persist(node);
		return FinanceNodeDto.from(node);
	}

	@Transactional
	public FinanceNodeDto update(Long id, FinanceNodeDto dto) throws BusinessException {
		FinanceNodeEntity node = financeNodeRepository.findById(id);
		if (node == null || node.archived) {
			throw new BusinessException(messages.get(MsgKey.NODE_NOT_FOUND_ARCHIVED_GENERIC));
		}
		node.name = dto.name();
		node.type = dto.type();
		node.description = dto.description();
		node.icon = dto.icon();

		financeNodeValidator.validate(node);

		return FinanceNodeDto.from(node);
	}

	@Transactional
	public void archive(Long id) throws BusinessException {
		FinanceNodeEntity node = financeNodeRepository.findById(id);
		if (node == null) {
			throw new BusinessException(messages.get(MsgKey.NODE_NOT_FOUND));
		}

		boolean inUseForRecurring = financeNodeRepository.countInTemplates(node) > 0
				|| financeNodeRepository.countInSubscriptions(node) > 0;

		if (inUseForRecurring) {
			throw new BusinessException(messages.get(MsgKey.NODE_ARCHIVE_IN_USE));
		}

		// It's always allowed to archive, we just don't physically delete
		node.archived = true;
	}

	@Transactional
	public void unarchive(Long id) throws BusinessException {
		FinanceNodeEntity node = financeNodeRepository.findById(id);
		if (node == null) {
			throw new BusinessException(messages.get(MsgKey.NODE_NOT_FOUND));
		}
		node.archived = false;
	}

	@Transactional
	public void delete(Long id) throws BusinessException {
		FinanceNodeEntity node = financeNodeRepository.findById(id);
		if (node == null) {
			throw new BusinessException(messages.get(MsgKey.NODE_NOT_FOUND));
		}

		boolean inUseForRecurring = financeNodeRepository.countInTemplates(node) > 0
				|| financeNodeRepository.countInSubscriptions(node) > 0;

		if (inUseForRecurring) {
			throw new BusinessException(messages.get(MsgKey.NODE_ARCHIVE_IN_USE));
		}
		
		long txCount = lineItemRepository.count("financeNode", node);
		if (txCount > 0) {
			throw new BusinessException(messages.get(MsgKey.NODE_HAS_TRANSACTIONS));
		}
		financeNodeRepository.delete(node);
	}

	@Transactional
	public BigDecimal calculateBalance(Long id) throws BusinessException {
		FinanceNodeEntity node = financeNodeRepository.findById(id);
		if (node == null) {
			throw new BusinessException(messages.get(MsgKey.NODE_NOT_FOUND));
		}

		// Calculate balance on-the-fly summing all amounts for this node
		// In this logic, positive amounts add to balance, negative decrease.
		// It depends on how transactions are registered (e.g. income is +, expense is -
		// for OWN accounts).
		BigDecimal total = lineItemRepository.find("financeNode", node)
				.stream()
				.map(lineItem -> lineItem.amount)
				.reduce(BigDecimal.ZERO, BigDecimal::add);

		return total;
	}
}
