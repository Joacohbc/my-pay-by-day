package com.mypaybyday.service.ai;

import java.util.ArrayList;
import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.entity.ChatMessageEntity;
import com.mypaybyday.enums.ChatMessageRole;
import com.mypaybyday.repository.ChatMessageRepository;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.data.message.ToolExecutionResultMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.store.memory.chat.ChatMemoryStore;
import org.jboss.logging.Logger;

@ApplicationScoped
public class DbChatMemoryStore implements ChatMemoryStore {

    private static final Logger log = Logger.getLogger(DbChatMemoryStore.class);

    private final ChatMessageRepository chatMessageRepository;

    public DbChatMemoryStore(ChatMessageRepository chatMessageRepository) {
        this.chatMessageRepository = chatMessageRepository;
    }

    @Override
    @Transactional
    public List<ChatMessage> getMessages(Object memoryId) {
        String chatId = memoryId.toString();
        List<ChatMessageEntity> entities = chatMessageRepository.findByChatIdOrderBySequence(chatId);
        List<ChatMessage> messages = new ArrayList<>();
        for (ChatMessageEntity entity : entities) {
            ChatMessage message = toLanguageChainMessage(entity);
            if (message != null) {
                messages.add(message);
            }
        }
        return messages;
    }

    @Override
    @Transactional
    public void updateMessages(Object memoryId, List<ChatMessage> messages) {
        String chatId = memoryId.toString();
        chatMessageRepository.deleteByChatId(chatId);
        for (int i = 0; i < messages.size(); i++) {
            ChatMessageEntity entity = toEntity(chatId, messages.get(i), i);
            chatMessageRepository.persist(entity);
        }
    }

    @Override
    @Transactional
    public void deleteMessages(Object memoryId) {
        chatMessageRepository.deleteByChatId(memoryId.toString());
    }

    private ChatMessage toLanguageChainMessage(ChatMessageEntity entity) {
        if (entity.role == ChatMessageRole.SYSTEM) {
            return SystemMessage.from(entity.content);
        }
        if (entity.role == ChatMessageRole.USER) {
            return UserMessage.from(entity.content);
        }
        if (entity.role == ChatMessageRole.AI) {
            return AiMessage.from(entity.content == null ? "" : entity.content);
        }
        if (entity.role == ChatMessageRole.TOOL) {
            return ToolExecutionResultMessage.from(entity.toolCallId, entity.toolName, entity.content);
        }
        log.warnf("Unknown role %s for chatId=%s, skipping message", entity.role, entity.chatId);
        return null;
    }

    private ChatMessageEntity toEntity(String chatId, ChatMessage message, int sequence) {
        ChatMessageEntity entity = new ChatMessageEntity();
        entity.chatId = chatId;
        entity.sequence = sequence;

        if (message instanceof SystemMessage sm) {
            entity.role = ChatMessageRole.SYSTEM;
            entity.content = sm.text();
        } else if (message instanceof UserMessage um) {
            entity.role = ChatMessageRole.USER;
            entity.content = um.singleText();
        } else if (message instanceof AiMessage am) {
            entity.role = ChatMessageRole.AI;
            entity.content = am.text();
        } else if (message instanceof ToolExecutionResultMessage trm) {
            entity.role = ChatMessageRole.TOOL;
            entity.content = trm.text();
            entity.toolCallId = trm.id();
            entity.toolName = trm.toolName();
        } else {
            entity.role = ChatMessageRole.USER;
            entity.content = message.toString();
        }
        return entity;
    }
}
