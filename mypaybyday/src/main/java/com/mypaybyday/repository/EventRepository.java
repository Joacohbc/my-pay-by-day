package com.mypaybyday.repository;

import java.util.List;

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

	public List<Object[]> countEventsPerCategory() {
		return find("SELECT e.category.id, COUNT(e) FROM FinanceEvent e WHERE e.category IS NOT NULL GROUP BY e.category.id")
				.project(Object[].class)
				.list();
	}

	public List<Object[]> countEventsPerTag() {
		return find("SELECT t.id, COUNT(e) FROM FinanceEvent e JOIN e.tags t GROUP BY t.id")
				.project(Object[].class)
				.list();
	}

	public List<Object[]> countRelationsPerEvent() {
		return find("SELECT e.id, CAST(COUNT(re.id) AS long) FROM FinanceEvent e JOIN e.relatedEvents re GROUP BY e.id")
				.project(Object[].class)
				.list();
	}
}

