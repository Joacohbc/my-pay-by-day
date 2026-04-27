package com.mypaybyday.repository;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.AgentTaskEntity;
import com.mypaybyday.entity.AgentTaskStepEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepository;

@ApplicationScoped
public class AgentTaskStepRepository implements PanacheRepository<AgentTaskStepEntity> {

    public List<AgentTaskStepEntity> findByTaskOrderBySequence(AgentTaskEntity task) {
        return list("task = ?1 ORDER BY sequence ASC", task);
    }

    public int nextSequence(AgentTaskEntity task) {
        Long max = find("task = ?1", task).project(Long.class)
                .stream()
                .mapToLong(s -> s == null ? 0 : s)
                .max()
                .orElse(0L);
        return (int) (max + 1);
    }
}
