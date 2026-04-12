package com.mypaybyday.repository;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.SystemJobEntity;
import com.mypaybyday.enums.JobCategory;
import com.mypaybyday.enums.JobStatus;
import io.quarkus.hibernate.orm.panache.PanacheRepository;

@ApplicationScoped
public class SystemJobRepository implements PanacheRepository<SystemJobEntity> {

	public SystemJobEntity findByCategory(JobCategory category) {
		return find("jobCategory", category).firstResult();
	}

	public List<SystemJobEntity> findPendingJobsByCategory(JobCategory category) {
		return find("jobCategory = ?1 and status != ?2 and status != ?3",
				category, JobStatus.COMPLETED, JobStatus.FAILED).list();
	}

	public SystemJobEntity findPendingJobByEntityId(JobCategory category, String entityId) {
		return find("jobCategory = ?1 and entityId = ?2 and status != ?3 and status != ?4",
				category, entityId, JobStatus.COMPLETED, JobStatus.FAILED).firstResult();
	}
}
