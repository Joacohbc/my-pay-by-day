package com.mypaybyday.entity;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import com.mypaybyday.enums.AgentTaskExecutionMode;
import com.mypaybyday.enums.AgentTaskStatus;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Table
@Entity(name = "AgentTask")
@Getter
@Setter
@NoArgsConstructor
public class AgentTaskEntity extends PanacheEntityBase {

    @Id
    @Column(length = 36)
    public String id;

    public String title;

    @Column(columnDefinition = "TEXT")
    public String userInstruction;

    @Enumerated(EnumType.STRING)
    public AgentTaskStatus status = AgentTaskStatus.PENDING;

    @Enumerated(EnumType.STRING)
    public AgentTaskExecutionMode executionMode = AgentTaskExecutionMode.AUTONOMOUS;

    @Column(updatable = false)
    public Instant createdAt;

    public Instant updatedAt;

    public LocalDateTime startedAt;

    public LocalDateTime finishedAt;

    public int progress = 0;

    public String currentStep;

    @Column(columnDefinition = "TEXT")
    public String finalResponse;

    public long totalInputTokens = 0;

    public long totalOutputTokens = 0;

    public int totalToolCalls = 0;

    public int totalLlmCalls = 0;

    @Column(precision = 18, scale = 8)
    public BigDecimal estimatedCostUsd;

    @Column(columnDefinition = "TEXT")
    public String lastError;

    public boolean cancelRequested = false;

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = java.util.UUID.randomUUID().toString();
        }
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
