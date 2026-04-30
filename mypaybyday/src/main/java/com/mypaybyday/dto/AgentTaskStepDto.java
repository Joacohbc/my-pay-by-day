package com.mypaybyday.dto;

import java.time.LocalDateTime;

import com.mypaybyday.entity.AgentTaskStepEntity;
import com.mypaybyday.enums.AgentTaskStepType;

public record AgentTaskStepDto(
        Long id,
        String taskId,
        int sequence,
        AgentTaskStepType type,
        String description,
        String content,
        LocalDateTime createdAt,
        long durationMs
) {

    public static AgentTaskStepDto from(AgentTaskStepEntity entity) {
        return new AgentTaskStepDto(
                entity.id,
                entity.task != null ? entity.task.getId() : null,
                entity.sequence,
                entity.type,
                entity.description,
                entity.content,
                entity.stepCreatedAt,
                entity.durationMs
        );
    }
}
