package com.mypaybyday.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import com.mypaybyday.enums.AgentTaskActionStatus;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Table
@Entity(name = "AgentTaskAction")
@Getter
@Setter
@NoArgsConstructor
public class AgentTaskActionEntity extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    public AgentTaskEntity task;

    @ManyToOne(fetch = FetchType.LAZY)
    public AgentTaskStepEntity step;

    public String actionType;

    @Column(columnDefinition = "TEXT")
    public String payload;

    @Enumerated(EnumType.STRING)
    public AgentTaskActionStatus status = AgentTaskActionStatus.PENDING_APPROVAL;

    public LocalDateTime actionCreatedAt;

    public LocalDateTime resolvedAt;

    public String resultMessage;
}
