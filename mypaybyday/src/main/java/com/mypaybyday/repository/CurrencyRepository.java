package com.mypaybyday.repository;

import java.util.List;
import java.util.Optional;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.CurrencyEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepository;

@ApplicationScoped
public class CurrencyRepository implements PanacheRepository<CurrencyEntity> {

	public Optional<CurrencyEntity> findByCode(String code) {
		return find("code", code).firstResultOptional();
	}

	public List<CurrencyEntity> listOrderedByCode() {
		return list("ORDER BY code");
	}

	public List<String> listPrincipalCodes() {
		return find("SELECT c.code FROM Currency c WHERE c.principal = true ORDER BY c.code")
				.project(String.class)
				.list();
	}
}
