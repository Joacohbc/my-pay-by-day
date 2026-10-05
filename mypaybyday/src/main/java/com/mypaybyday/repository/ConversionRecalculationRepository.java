package com.mypaybyday.repository;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.ConversionRecalculationEntity;
import com.mypaybyday.enums.JobStatus;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Page;
import io.quarkus.panache.common.Sort;

@ApplicationScoped
public class ConversionRecalculationRepository implements PanacheRepository<ConversionRecalculationEntity> {

	public List<ConversionRecalculationEntity> listNewestFirst(int limit) {
		return findAll(Sort.descending("id")).page(Page.ofSize(limit)).list();
	}

	public List<ConversionRecalculationEntity> listPendingOldestFirst() {
		return find("status", Sort.ascending("id"), JobStatus.PENDING).list();
	}

	public boolean existsPendingInto(String targetCurrency) {
		return count("status = ?1 and targetCurrency = ?2", JobStatus.PENDING, targetCurrency) > 0;
	}
}
