package com.mypaybyday.service;

import com.mypaybyday.entity.FinanceNode;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.repository.FinanceNodeRepository;
import com.mypaybyday.repository.LineItemRepository;
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

    public List<FinanceNode> listAll() {
        return financeNodeRepository.list("archived", false);
    }

    public FinanceNode findById(Long id) {
        FinanceNode node = financeNodeRepository.findById(id);
        if (node == null || node.archived) {
            return null;
        }
        return node;
    }

    @Transactional
    public FinanceNode create(FinanceNode node) {
        financeNodeRepository.persist(node);
        return node;
    }

    @Transactional
    public FinanceNode update(Long id, FinanceNode nodeDetails) {
        FinanceNode node = financeNodeRepository.findById(id);
        if (node == null || node.archived) {
            throw new BusinessException("FinanceNode not found or is archived");
        }
        node.name = nodeDetails.name;
        node.type = nodeDetails.type;
        return node;
    }

    @Transactional
    public void archive(Long id) {
        FinanceNode node = financeNodeRepository.findById(id);
        if (node == null) {
            throw new BusinessException("FinanceNode not found");
        }
        // It's always allowed to archive, we just don't physically delete
        node.archived = true;
    }

    @Transactional
    public void delete(Long id) {
        FinanceNode node = financeNodeRepository.findById(id);
        if (node == null) {
            throw new BusinessException("FinanceNode not found");
        }
        long txCount = lineItemRepository.count("financeNode", node);
        if (txCount > 0) {
            throw new BusinessException("Cannot delete FinanceNode with existing transactions. Please archive it instead.");
        }
        financeNodeRepository.delete(node);
    }

    public BigDecimal calculateBalance(Long id) {
        FinanceNode node = financeNodeRepository.findById(id);
        if (node == null) {
            throw new BusinessException("FinanceNode not found");
        }

        // Calculate balance on-the-fly summing all amounts for this node
        // In this logic, positive amounts add to balance, negative decrease.
        // It depends on how transactions are registered (e.g. income is +, expense is - for OWN accounts).
        BigDecimal total = lineItemRepository.find("financeNode", node)
                .stream()
                .map(lineItem -> lineItem.amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return total;
    }
}
