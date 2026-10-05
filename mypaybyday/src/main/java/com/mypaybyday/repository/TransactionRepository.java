package com.mypaybyday.repository;

import java.time.LocalDateTime;
import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.FinanceTransactionEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Page;
import io.quarkus.panache.common.Parameters;

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

	/**
	 * Transactions recorded in {@code currency}, dated within the given bounds (either may be
	 * {@code null} to leave that side open), in id order starting after {@code afterId}.
	 */
	public List<FinanceTransactionEntity> findRecordedIn(String currency, LocalDateTime startDate,
			LocalDateTime endDate, long afterId, int batchSize) {
		StringBuilder query = new StringBuilder("SELECT t FROM FinanceTransaction t WHERE t.id > :afterId"
				+ " AND EXISTS (SELECT li FROM FinanceLineItem li WHERE li.transaction = t AND li.currency = :currency)");
		Parameters parameters = Parameters.with("afterId", afterId).and("currency", currency);
		if (startDate != null) {
			query.append(" AND t.transactionDate >= :startDate");
			parameters.and("startDate", startDate);
		}
		if (endDate != null) {
			query.append(" AND t.transactionDate <= :endDate");
			parameters.and("endDate", endDate);
		}
		query.append(" ORDER BY t.id");
		return find(query.toString(), parameters).page(Page.ofSize(batchSize)).list();
	}
}
