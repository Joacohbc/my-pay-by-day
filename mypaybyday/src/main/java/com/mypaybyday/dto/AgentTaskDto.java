package com.mypaybyday.dto;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

import com.mypaybyday.entity.AgentTaskEntity;
import com.mypaybyday.enums.AgentTaskExecutionMode;
import com.mypaybyday.enums.AgentTaskStatus;

public record AgentTaskDto(
        String id,
        String title,
        String userInstruction,
        AgentTaskStatus status,
        AgentTaskExecutionMode executionMode,
        Instant createdAt,
        LocalDateTime startedAt,
        LocalDateTime finishedAt,
        int progress,
        String currentStep,
        String lang,
        String timezone,
        boolean cancelRequested,
        List<AgentTaskStepDto> steps,
        List<AgentTaskAttachmentDto> attachments,
        List<AgentTaskActionDto> actions
) {

    public static AgentTaskDto from(AgentTaskEntity entity) {
        return fromWithDetails(entity, null, null, null);
    }

    public static AgentTaskDto fromWithDetails(
            AgentTaskEntity entity,
            List<AgentTaskStepDto> steps,
            List<AgentTaskAttachmentDto> attachments,
            List<AgentTaskActionDto> actions) {
        return new AgentTaskDto(
                entity.getId(),
                entity.getTitle(),
                entity.getUserInstruction(),
                entity.getStatus(),
                entity.getExecutionMode(),
                entity.getCreatedAt(),
                entity.getStartedAt(),
                entity.getFinishedAt(),
                entity.getProgress(),
                entity.getCurrentStep(),
                entity.getLang(),
                entity.getTimezone(),
                entity.isCancelRequested(),
                steps,
                attachments,
                actions
        );
    }
}
