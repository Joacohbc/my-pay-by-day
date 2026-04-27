package com.mypaybyday.repository;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.ChatMessageEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepository;

@ApplicationScoped
public class ChatMessageRepository implements PanacheRepository<ChatMessageEntity> {

    public List<ChatMessageEntity> findByChatIdOrderBySequence(String chatId) {
        return list("chatId = ?1 ORDER BY sequence ASC", chatId);
    }

    public void deleteByChatId(String chatId) {
        delete("chatId", chatId);
    }

    public int nextSequence(String chatId) {
        return (int) count("chatId", chatId);
    }
}
