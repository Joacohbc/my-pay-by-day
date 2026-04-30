package com.mypaybyday.repository;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.AgentTaskAttachmentEntity;
import com.mypaybyday.entity.AgentTaskEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepository;

@ApplicationScoped
public class AgentTaskAttachmentRepository implements PanacheRepository<AgentTaskAttachmentEntity> {

    public List<AgentTaskAttachmentEntity> findByTask(AgentTaskEntity task) {
        return list("task", task);
    }

    public long countUnparsedByTask(AgentTaskEntity task) {
        return count("task = ?1 AND parsedAt IS NULL AND parseError IS NULL", task);
    }
}
