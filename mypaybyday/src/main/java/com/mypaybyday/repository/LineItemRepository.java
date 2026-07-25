package com.mypaybyday.repository;

import java.time.LocalDateTime;
import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.FinanceLineItemEntity;
import com.mypaybyday.entity.FinanceNodeEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepository;

@ApplicationScoped
public class LineItemRepository implements PanacheRepository<FinanceLineItemEntity> {

	public List<Object[]> countLineItemsPerNode() {
		return find("SELECT li.financeNode.id, COUNT(li) FROM FinanceLineItem li GROUP BY li.financeNode.id")
				.project(Object[].class)
				.list();
	}

	/**
	* Line items on the given node whose transaction happened at or before {@code cutoff}.
	*
	* <p>
	* The date lives on the parent transaction, which is mapped {@code LAZY}; filtering it
	* here in JPQL keeps the caller from walking every line item and triggering a query per
	* row. The date column is not encrypted, so unlike {@code amount} it can be compared in
	* SQL.
	*/
	public List<FinanceLineItemEntity> findByNodeUpTo(FinanceNodeEntity node, LocalDateTime cutoff) {
		return find("financeNode = ?1 and transaction.transactionDate <= ?2", node, cutoff).list();
	}

	/**
	* Line items on the given node whose transaction falls in {@code (from, to]} —
	* lower bound exclusive so consecutive cycles never double-count the boundary.
	*/
	public List<FinanceLineItemEntity> findByNodeBetween(FinanceNodeEntity node, LocalDateTime from, LocalDateTime to) {
		return find("financeNode = ?1 and transaction.transactionDate > ?2 and transaction.transactionDate <= ?3",
				node, from, to).list();
	}
}

