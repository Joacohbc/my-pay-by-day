package com.mypaybyday.repository;

import com.mypaybyday.entity.SystemJob;
import com.mypaybyday.enums.JobCategory;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class SystemJobRepository implements PanacheRepository<SystemJob> {

    public SystemJob findByCategory(JobCategory category) {
        return find("jobCategory", category).firstResult();
    }
}
