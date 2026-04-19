package com.mypaybyday.repository;

import java.util.List;
import java.util.Optional;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.DuplicateRecordEntity;
import com.mypaybyday.enums.DuplicateRecordStatus;
import com.mypaybyday.enums.EntityType;
import io.quarkus.hibernate.orm.panache.PanacheRepository;

@ApplicationScoped
public class DuplicateRecordRepository implements PanacheRepository<DuplicateRecordEntity> {

	public List<DuplicateRecordEntity> findByEntityTypeAndStatus(EntityType type, DuplicateRecordStatus status) {
		return find("entityType = ?1 and status = ?2", type, status).list();
	}

	public List<DuplicateRecordEntity> findByEntityIdAndStatus(EntityType type, Long entityId, DuplicateRecordStatus status) {
		return find("entityType = ?1 and status = ?2 and (entityId1 = ?3 or entityId2 = ?3)", type, status, entityId).list();
	}

	public Optional<DuplicateRecordEntity> findByEntities(EntityType type, Long entityId1, Long entityId2) {
		return find("entityType = ?1 and ((entityId1 = ?2 and entityId2 = ?3) or (entityId1 = ?3 and entityId2 = ?2))", type, entityId1, entityId2).firstResultOptional();
	}
}
