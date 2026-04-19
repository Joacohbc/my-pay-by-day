package com.mypaybyday.repository;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.FinanceNodeEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepository;

@ApplicationScoped
public class FinanceNodeRepository implements PanacheRepository<FinanceNodeEntity> {

	public List<FinanceNodeEntity> list(List<Long> ids) {
		return list("id in ?1", ids);
	}

	public long countInTemplates(FinanceNodeEntity node) {
		return count("from Template t where t.originNode = ?1 or t.destinationNode = ?1", node);
	}

	public long countInSubscriptions(FinanceNodeEntity node) {
		return count("from Subscription s where s.originNode = ?1 or s.destinationNode = ?1", node);
	}
}
