package com.mypaybyday.service.ai;

import java.util.ArrayList;
import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mypaybyday.entity.ChatMessageEntity;
import com.mypaybyday.enums.ChatMessageRole;
import com.mypaybyday.repository.ChatMessageRepository;
import dev.langchain4j.agent.tool.ToolExecutionRequest;
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
    private final ObjectMapper objectMapper;

    public DbChatMemoryStore(ChatMessageRepository chatMessageRepository, ObjectMapper objectMapper) {
        this.chatMessageRepository = chatMessageRepository;
        this.objectMapper = objectMapper;
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
            return deserializeAiMessage(entity);
        }
        if (entity.role == ChatMessageRole.TOOL) {
            return ToolExecutionResultMessage.from(entity.toolCallId, entity.toolName, entity.content);
        }
        log.warnf("Unknown role %s for chatId=%s, skipping message", entity.role, entity.chatId);
        return null;
    }

    private AiMessage deserializeAiMessage(ChatMessageEntity entity) {
        if ("tool_calls".equals(entity.toolName)) {
            try {
                List<ToolExecutionRequest> requests = objectMapper.readValue(
                        entity.content,
                        objectMapper.getTypeFactory().constructCollectionType(List.class, ToolExecutionRequest.class));
                return AiMessage.from(requests);
            } catch (JsonProcessingException e) {
                log.warnf("Failed to deserialize tool requests for chatId=%s, falling back to text", entity.chatId);
            }
        }
        return AiMessage.from(entity.content != null ? entity.content : "");
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
            if (am.hasToolExecutionRequests()) {
                try {
                    entity.content = objectMapper.writeValueAsString(am.toolExecutionRequests());
                    entity.toolName = "tool_calls";
                } catch (JsonProcessingException e) {
                    log.warnf("Failed to serialize tool requests for chatId=%s", chatId);
                    entity.content = "";
                }
            } else {
                entity.content = am.text();
            }
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
