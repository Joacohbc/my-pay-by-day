package com.mypaybyday.repository;

import java.util.List;
import java.util.Optional;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.ExchangeRateEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepository;

@ApplicationScoped
public class ExchangeRateRepository implements PanacheRepository<ExchangeRateEntity> {

	public Optional<ExchangeRateEntity> findLatest(String baseCurrency, String currency) {
		return find("baseCurrency = ?1 AND currency = ?2 ORDER BY id DESC", baseCurrency, currency)
				.firstResultOptional();
	}

	public List<ExchangeRateEntity> listLatestPerCurrency(String baseCurrency) {
		return list("baseCurrency = ?1 AND id IN "
				+ "(SELECT MAX(r.id) FROM ExchangeRate r WHERE r.baseCurrency = ?1 GROUP BY r.currency)",
				baseCurrency);
	}

	public List<ExchangeRateEntity> listHistory(String currency) {
		if (currency == null) {
			return list("ORDER BY id DESC");
		}
		return list("currency = ?1 ORDER BY id DESC", currency);
	}
}
