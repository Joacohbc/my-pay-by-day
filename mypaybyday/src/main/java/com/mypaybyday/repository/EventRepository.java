package com.mypaybyday.repository;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.CategoryEntity;
import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.entity.TagEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepository;

@ApplicationScoped
public class EventRepository implements PanacheRepository<FinanceEventEntity> {

	public long countByCategory(CategoryEntity category) {
		return count("category", category);
	}

	public long countByTag(TagEntity tag) {
		return count("from FinanceEvent e where ?1 member of e.tags", tag);
	}
}
