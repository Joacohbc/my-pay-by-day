package com.mypaybyday.service;

import com.mypaybyday.dto.FinanceNodeDto;
import com.mypaybyday.dto.PagedResponse;
import com.mypaybyday.entity.FinanceNode;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.FinanceNodeRepository;
import com.mypaybyday.repository.LineItemRepository;
import io.quarkus.panache.common.Page;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.math.BigDecimal;
import java.util.List;

@ApplicationScoped
public class FinanceNodeService {

    @Inject
    FinanceNodeRepository financeNodeRepository;

    @Inject
    LineItemRepository lineItemRepository;

    @Inject
    Messages messages;

    @Transactional
    public PagedResponse<FinanceNodeDto> listAll(int page, int size, Boolean archived) {
        long totalElements;
        List<FinanceNodeDto> content;

        if (archived == null) {
            totalElements = financeNodeRepository.count("archived", false);
            content = financeNodeRepository.find("archived", false)
                    .page(Page.of(page, size))
                    .stream()
                    .map(FinanceNodeDto::from)
                    .toList();
        } else {
            totalElements = financeNodeRepository.count();
            content = financeNodeRepository.findAll()
                    .page(Page.of(page, size))
                    .stream()
                    .map(FinanceNodeDto::from)
                    .toList();
        }

        return PagedResponse.of(content, page, size, totalElements);
    }

    @Transactional
    public FinanceNodeDto findById(Long id) {
        FinanceNode node = financeNodeRepository.findById(id);
        if (node == null || node.archived) {
            return null;
        }
        return FinanceNodeDto.from(node);
    }

    /**
     * Internal method used by other services that need a managed
     * {@link FinanceNode} entity
     * (e.g. {@link TransactionService} when resolving node references on line
     * items).
     */
    FinanceNode findNodeEntity(Long id) throws BusinessException {
        FinanceNode node = financeNodeRepository.findById(id);
        if (node == null || node.archived) {
            throw new BusinessException(messages.get(MsgKey.NODE_NOT_FOUND_ARCHIVED, id));
        }
        return node;
    }

    @Transactional
    public FinanceNodeDto create(FinanceNodeDto dto) {
        FinanceNode node = new FinanceNode();
        node.name = dto.name();
        node.type = dto.type();
        financeNodeRepository.persist(node);
        return FinanceNodeDto.from(node);
    }

    @Transactional
    public FinanceNodeDto update(Long id, FinanceNodeDto dto) throws BusinessException {
        FinanceNode node = financeNodeRepository.findById(id);
        if (node == null || node.archived) {
            throw new BusinessException(messages.get(MsgKey.NODE_NOT_FOUND_ARCHIVED_GENERIC));
        }
        node.name = dto.name();
        node.type = dto.type();
        return FinanceNodeDto.from(node);
    }

    @Transactional
    public void archive(Long id) throws BusinessException {
        FinanceNode node = financeNodeRepository.findById(id);
        if (node == null) {
            throw new BusinessException(messages.get(MsgKey.NODE_NOT_FOUND));
        }
        // It's always allowed to archive, we just don't physically delete
        node.archived = true;
    }

    @Transactional
    public void unarchive(Long id) throws BusinessException {
        FinanceNode node = financeNodeRepository.findById(id);
        if (node == null) {
            throw new BusinessException(messages.get(MsgKey.NODE_NOT_FOUND));
        }
        node.archived = false;
    }

    @Transactional
    public void delete(Long id) throws BusinessException {
        FinanceNode node = financeNodeRepository.findById(id);
        if (node == null) {
            throw new BusinessException(messages.get(MsgKey.NODE_NOT_FOUND));
        }
        long txCount = lineItemRepository.count("financeNode", node);
        if (txCount > 0) {
            throw new BusinessException(messages.get(MsgKey.NODE_HAS_TRANSACTIONS));
        }
        financeNodeRepository.delete(node);
    }

    @Transactional
    public BigDecimal calculateBalance(Long id) throws BusinessException {
        FinanceNode node = financeNodeRepository.findById(id);
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
