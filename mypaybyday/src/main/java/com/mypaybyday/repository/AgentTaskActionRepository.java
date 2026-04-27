package com.mypaybyday.repository;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.AgentTaskActionEntity;
import com.mypaybyday.entity.AgentTaskEntity;
import com.mypaybyday.enums.AgentTaskActionStatus;
import io.quarkus.hibernate.orm.panache.PanacheRepository;

@ApplicationScoped
public class AgentTaskActionRepository implements PanacheRepository<AgentTaskActionEntity> {

    public List<AgentTaskActionEntity> findByTask(AgentTaskEntity task) {
        return list("task", task);
    }

    public List<AgentTaskActionEntity> findPendingByTask(AgentTaskEntity task) {
        return list("task = ?1 AND status = ?2", task, AgentTaskActionStatus.PENDING_APPROVAL);
    }
}
