package com.mypaybyday.service.agent;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.transaction.Transactional;

import com.mypaybyday.entity.AgentTaskEntity;
import com.mypaybyday.enums.AgentTaskStatus;
import com.mypaybyday.repository.AgentTaskRepository;
import io.quarkus.runtime.StartupEvent;
import org.jboss.logging.Logger;

@ApplicationScoped
public class AgentTaskRecoveryBean {

    private static final Logger log = Logger.getLogger(AgentTaskRecoveryBean.class);

    private final AgentTaskRepository taskRepository;

    public AgentTaskRecoveryBean(AgentTaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    @Transactional
    public void onStartup(@Observes StartupEvent event) {
        List<AgentTaskEntity> stuckTasks = taskRepository.findByStatusIn(
                List.of(AgentTaskStatus.RUNNING, AgentTaskStatus.RETRYING));

        if (stuckTasks.isEmpty()) return;

        log.warnf("Found %d stuck task(s) from previous run — marking as INTERRUPTED", stuckTasks.size());
        for (AgentTaskEntity task : stuckTasks) {
            task.status = AgentTaskStatus.INTERRUPTED;
            task.lastError = "Task was interrupted by server restart. Use POST /api/agent-tasks/{id}/resume to restart.";
            taskRepository.persist(task);
            log.warnf("Task %s marked as INTERRUPTED", task.getId());
        }
    }
}
