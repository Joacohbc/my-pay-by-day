package com.mypaybyday.ai;

import dev.langchain4j.memory.ChatMemory;
import dev.langchain4j.memory.chat.ChatMemoryProvider;
import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import jakarta.enterprise.context.ApplicationScoped;
import org.jboss.logging.Logger;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/**
 * Provides ChatMemory for AI Services using @MemoryId.
 * Currently uses an in-memory storage.
 * For full persistence across restarts, a ChatMemoryStore could be used.
 */
@ApplicationScoped
public class ChatMemoryOnRAM implements Supplier<ChatMemoryProvider> {

    private static final Logger log = Logger.getLogger(ChatMemoryOnRAM.class);
    private final Map<Object, ChatMemory> memoryMap = new ConcurrentHashMap<>();

    public ChatMemoryProvider chatMemoryProvider() {
        return chatId -> memoryMap.computeIfAbsent(chatId, id ->
                MessageWindowChatMemory.builder()
                        .maxMessages(20)
                        .id(id)
                        .build()
        );
    }

    @Override
    public ChatMemoryProvider get() {
        return chatMemoryProvider();
    }

    /**
     * Clears the memory for a specific chat ID.
     * @param chatId The ID to clear.
     */
    public void clear(String chatId) {
        log.infof("Clearing memory for chatId: %s", chatId);
        memoryMap.remove(chatId);
    }
}
