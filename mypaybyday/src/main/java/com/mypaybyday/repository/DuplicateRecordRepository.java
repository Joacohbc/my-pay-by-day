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

	/**
	 * Retrieves duplicates for the UI.
	 * 
	 * Implementation note (Optimization): Since the system stores symmetric pairs (A->B and B->A) 
	 * to facilitate individual queries, the 'entityId1 < entityId2' condition delegates 
	 * deduplication to the database. It ensures only one representative record per pair 
	 * is returned, preventing visually duplicated items in the frontend without in-memory filtering.
	 */
	public List<DuplicateRecordEntity> findByEntityTypeAndStatus(EntityType type, DuplicateRecordStatus status) {
		return find("entityType = ?1 and status = ?2 and entityId1 < entityId2", type, status).list();
	}

	public List<DuplicateRecordEntity> findByEntityIdAndStatus(EntityType type, Long entityId, DuplicateRecordStatus status) {
		return find("entityType = ?1 and status = ?2 and entityId1 = ?3", type, status, entityId).list();
	}

	public List<DuplicateRecordEntity> findAllByEntity(EntityType type, Long entityId) {
		return find("entityType = ?1 and (entityId1 = ?2 or entityId2 = ?2)", type, entityId).list();
	}

	public Optional<DuplicateRecordEntity> findByEntities(EntityType type, Long entityId1, Long entityId2) {
		return find("entityType = ?1 and ((entityId1 = ?2 and entityId2 = ?3) or (entityId1 = ?3 and entityId2 = ?2))", type, entityId1, entityId2).firstResultOptional();
	}

	public List<DuplicateRecordEntity> findAllByEntities(EntityType type, Long entityId1, Long entityId2) {
		return find("entityType = ?1 and ((entityId1 = ?2 and entityId2 = ?3) or (entityId1 = ?3 and entityId2 = ?2))", type, entityId1, entityId2).list();
	}
}
