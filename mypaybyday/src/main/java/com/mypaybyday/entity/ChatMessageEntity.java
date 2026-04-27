package com.mypaybyday.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

import com.mypaybyday.enums.ChatMessageRole;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Table(indexes = {
    @Index(columnList = "chat_id, sequence")
})
@Entity(name = "ChatMessage")
@Getter
@Setter
@NoArgsConstructor
public class ChatMessageEntity extends BaseEntity {

    @Column(name = "chat_id")
    public String chatId;

    public int sequence;

    @Enumerated(EnumType.STRING)
    public ChatMessageRole role;

    @Column(columnDefinition = "TEXT")
    public String content;

    public String toolCallId;

    public String toolName;
}
