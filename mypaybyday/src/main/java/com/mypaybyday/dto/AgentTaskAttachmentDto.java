package com.mypaybyday.dto;

import java.time.LocalDateTime;

import com.mypaybyday.entity.AgentTaskAttachmentEntity;
import com.mypaybyday.enums.AgentAttachmentKind;

public record AgentTaskAttachmentDto(
        Long id,
        String taskId,
        Long fileId,
        AgentAttachmentKind kind,
        String originalName,
        String mimeType,
        long sizeBytes,
        String parserVersion,
        LocalDateTime parsedAt,
        String parseError,
        int tokenCount,
        String metadata
) {

    public static AgentTaskAttachmentDto from(AgentTaskAttachmentEntity entity) {
        return new AgentTaskAttachmentDto(
                entity.id,
                entity.task != null ? entity.task.getId() : null,
                entity.file != null ? entity.file.id : null,
                entity.kind,
                entity.originalName,
                entity.mimeType,
                entity.sizeBytes,
                entity.parserVersion,
                entity.parsedAt,
                entity.parseError,
                entity.tokenCount,
                entity.metadata
        );
    }
}
