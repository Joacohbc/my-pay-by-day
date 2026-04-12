package com.mypaybyday.repository;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.CategoryEntity;
import com.mypaybyday.entity.TagEntity;
import com.mypaybyday.entity.TemplateEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepository;

@ApplicationScoped
public class TemplateRepository implements PanacheRepository<TemplateEntity> {

	public long countByCategory(CategoryEntity category) {
		return count("category", category);
	}

	public long countByTag(TagEntity tag) {
		return count("from Template t where ?1 member of t.tags", tag);
	}
}
