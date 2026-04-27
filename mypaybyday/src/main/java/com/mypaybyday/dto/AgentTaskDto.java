package com.mypaybyday.dto;

import java.math.BigDecimal;
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
        String finalResponse,
        long totalInputTokens,
        long totalOutputTokens,
        int totalToolCalls,
        int totalLlmCalls,
        BigDecimal estimatedCostUsd,
        String lastError,
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
                entity.getFinalResponse(),
                entity.getTotalInputTokens(),
                entity.getTotalOutputTokens(),
                entity.getTotalToolCalls(),
                entity.getTotalLlmCalls(),
                entity.getEstimatedCostUsd(),
                entity.getLastError(),
                entity.isCancelRequested(),
                steps,
                attachments,
                actions
        );
    }
}
