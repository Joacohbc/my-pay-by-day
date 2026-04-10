package com.mypaybyday.repository;

import com.mypaybyday.entity.EntityDraft;
import com.mypaybyday.enums.EntityType;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;

@ApplicationScoped
public class EntityDraftRepository implements PanacheRepository<EntityDraft> {

    public Optional<EntityDraft> findByOriginalEntityIdAndType(Long originalEntityId, EntityType entityType) {
        return find("originalEntityId = ?1 and entityType = ?2", originalEntityId, entityType).firstResultOptional();
    }

    public long deleteByOriginalEntityIdAndType(Long originalEntityId, EntityType entityType) {
        return delete("originalEntityId = ?1 and entityType = ?2", originalEntityId, entityType);
    }
}
