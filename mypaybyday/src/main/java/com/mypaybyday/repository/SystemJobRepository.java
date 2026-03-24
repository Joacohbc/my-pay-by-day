package com.mypaybyday.repository;

import com.mypaybyday.entity.SystemJob;
import com.mypaybyday.enums.JobCategory;
import com.mypaybyday.enums.JobStatus;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class SystemJobRepository implements PanacheRepository<SystemJob> {

    public SystemJob findByCategory(JobCategory category) {
        return find("jobCategory", category).firstResult();
    }

    public List<SystemJob> findPendingJobsByCategory(JobCategory category) {
<<<<<<< HEAD
        return find("jobCategory = ?1 and status != ?2 and status != ?3",
=======
        return find("jobCategory = ?1 and status != ?2 and status != ?3", 
>>>>>>> origin/master
                category, JobStatus.COMPLETED, JobStatus.FAILED).list();
    }

    public SystemJob findPendingJobByEntityId(JobCategory category, String entityId) {
<<<<<<< HEAD
        return find("jobCategory = ?1 and entityId = ?2 and status != ?3 and status != ?4",
=======
        return find("jobCategory = ?1 and entityId = ?2 and status != ?3 and status != ?4", 
>>>>>>> origin/master
                category, entityId, JobStatus.COMPLETED, JobStatus.FAILED).firstResult();
    }
}
