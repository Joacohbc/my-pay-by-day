package com.mypaybyday.repository;

import com.mypaybyday.entity.DraftEntity;
import com.mypaybyday.enums.EntityType;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;

@ApplicationScoped
public class EntityDraftRepository implements PanacheRepository<DraftEntity> {

	public Optional<DraftEntity> findByOriginalEntityIdAndType(Long originalEntityId, EntityType entityType) {
		return find("originalEntityId = ?1 and entityType = ?2", originalEntityId, entityType).firstResultOptional();
	}

	public long deleteByOriginalEntityIdAndType(Long originalEntityId, EntityType entityType) {
		return delete("originalEntityId = ?1 and entityType = ?2", originalEntityId, entityType);
	}
}
