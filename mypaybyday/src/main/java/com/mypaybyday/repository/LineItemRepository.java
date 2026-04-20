package com.mypaybyday.repository;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.FinanceLineItemEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepository;

@ApplicationScoped
public class LineItemRepository implements PanacheRepository<FinanceLineItemEntity> {

	public List<Object[]> countLineItemsPerNode() {
		return find("SELECT li.financeNode.id, COUNT(li) FROM FinanceLineItem li GROUP BY li.financeNode.id")
				.project(Object[].class)
				.list();
	}
}

