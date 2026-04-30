package com.mypaybyday.dto;

import java.time.LocalDateTime;

import com.mypaybyday.entity.AgentTaskActionEntity;
import com.mypaybyday.enums.AgentTaskActionStatus;
import com.mypaybyday.enums.AgentTaskActionType;

public record AgentTaskActionDto(
        Long id,
        String taskId,
        Long stepId,
        AgentTaskActionType actionType,
        String payload,
        AgentTaskActionStatus status,
        LocalDateTime createdAt,
        LocalDateTime resolvedAt,
        String resultMessage
) {

    public static AgentTaskActionDto from(AgentTaskActionEntity entity) {
        return new AgentTaskActionDto(
                entity.id,
                entity.task != null ? entity.task.getId() : null,
                entity.step != null ? entity.step.id : null,
                entity.actionType,
                entity.payload,
                entity.status,
                entity.actionCreatedAt,
                entity.resolvedAt,
                entity.resultMessage
        );
    }
}
