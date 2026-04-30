package com.mypaybyday.repository;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.AgentTaskEntity;
import com.mypaybyday.enums.AgentTaskStatus;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;

@ApplicationScoped
public class AgentTaskRepository implements PanacheRepositoryBase<AgentTaskEntity, String> {

    public List<AgentTaskEntity> findByStatus(AgentTaskStatus status) {
        return list("status", status);
    }

    public List<AgentTaskEntity> findByStatusIn(List<AgentTaskStatus> statuses) {
        return list("status IN ?1", statuses);
    }
}
