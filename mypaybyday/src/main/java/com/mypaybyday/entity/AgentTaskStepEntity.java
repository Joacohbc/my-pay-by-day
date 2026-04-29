package com.mypaybyday.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import com.mypaybyday.enums.AgentTaskStepType;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Table
@Entity(name = "AgentTaskStep")
@Getter
@Setter
@NoArgsConstructor
public class AgentTaskStepEntity extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    public AgentTaskEntity task;

    public int sequence;

    @Enumerated(EnumType.STRING)
    public AgentTaskStepType type;

    @Column(columnDefinition = "TEXT")
    public String description;

    @Column(columnDefinition = "TEXT")
    public String content;

    public int tokensIn;

    public int tokensOut;

    public LocalDateTime stepCreatedAt;

    public long durationMs;
}
