package com.mypaybyday.repository;

import java.util.Optional;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.DraftEntity;
import com.mypaybyday.enums.EntityType;
import io.quarkus.hibernate.orm.panache.PanacheRepository;

@ApplicationScoped
public class EntityDraftRepository implements PanacheRepository<DraftEntity> {

	public Optional<DraftEntity> findByOriginalEntityIdAndType(Long originalEntityId, EntityType entityType) {
		return find("originalEntityId = ?1 and entityType = ?2", originalEntityId, entityType).firstResultOptional();
	}

	public long deleteByOriginalEntityIdAndType(Long originalEntityId, EntityType entityType) {
		return delete("originalEntityId = ?1 and entityType = ?2", originalEntityId, entityType);
	}
}
