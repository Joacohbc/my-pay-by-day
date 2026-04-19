package com.mypaybyday.repository;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.DuplicateDetectionSettingsEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepository;

@ApplicationScoped
public class DuplicateDetectionSettingsRepository implements PanacheRepository<DuplicateDetectionSettingsEntity> {

	public DuplicateDetectionSettingsEntity getSettings() {
		DuplicateDetectionSettingsEntity settings = find("").firstResult();
		if (settings == null) {
			settings = new DuplicateDetectionSettingsEntity();
			persist(settings);
		}
		return settings;
	}
}
