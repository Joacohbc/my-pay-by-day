package com.mypaybyday.repository;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.FinanceTransactionEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Page;

@ApplicationScoped
public class TransactionRepository implements PanacheRepository<FinanceTransactionEntity> {

	/**
	 * Transactions recorded in a currency other than {@code currency} that hold no rate to it yet,
	 * in id order starting after {@code afterId}, so a caller can walk them in batches without
	 * revisiting the ones it could not convert.
	 */
	public List<FinanceTransactionEntity> findMissingConversion(String currency, long afterId, int batchSize) {
		return find("SELECT t FROM FinanceTransaction t WHERE t.id > ?2"
				+ " AND NOT EXISTS (SELECT c FROM TransactionConversion c WHERE c.transaction = t AND c.currency = ?1)"
				+ " AND EXISTS (SELECT li FROM FinanceLineItem li WHERE li.transaction = t AND li.currency <> ?1)"
				+ " ORDER BY t.id", currency, afterId)
				.page(Page.ofSize(batchSize))
				.list();
	}
}
