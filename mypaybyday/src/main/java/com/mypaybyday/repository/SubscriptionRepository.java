package com.mypaybyday.repository;

import com.mypaybyday.entity.CategoryEntity;
import com.mypaybyday.entity.SubscriptionEntity;
import com.mypaybyday.entity.TagEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class SubscriptionRepository implements PanacheRepository<SubscriptionEntity> {

	public long countByCategory(CategoryEntity category) {
		return count("category", category);
	}

	public long countByTag(TagEntity tag) {
		return count("from Subscription s where ?1 member of s.tags", tag);
	}
}
