package com.mypaybyday.repository;

import java.util.Optional;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.SelectionHistoryEntity;
import com.mypaybyday.enums.EntityType;
import io.quarkus.hibernate.orm.panache.PanacheRepository;

@ApplicationScoped
public class SelectionHistoryRepository implements PanacheRepository<SelectionHistoryEntity> {

	public Optional<SelectionHistoryEntity> findByEntityTypeAndEntityId(EntityType type, Long entityId) {
		return find("entityType = ?1 and entityId = ?2", type, entityId).firstResultOptional();
	}
}
