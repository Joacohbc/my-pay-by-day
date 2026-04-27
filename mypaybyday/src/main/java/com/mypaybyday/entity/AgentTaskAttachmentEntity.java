package com.mypaybyday.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import com.mypaybyday.enums.AgentAttachmentKind;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Table
@Entity(name = "AgentTaskAttachment")
@Getter
@Setter
@NoArgsConstructor
public class AgentTaskAttachmentEntity extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    public AgentTaskEntity task;

    @ManyToOne(fetch = FetchType.LAZY)
    public FileEntity file;

    @Enumerated(EnumType.STRING)
    public AgentAttachmentKind kind;

    public String originalName;

    public String mimeType;

    public long sizeBytes;

    @Lob
    @Column(columnDefinition = "TEXT")
    public String parsedContent;

    public String parserVersion;

    public LocalDateTime parsedAt;

    public String parseError;

    public int tokenCount;

    @Column(columnDefinition = "TEXT")
    public String metadata;
}
