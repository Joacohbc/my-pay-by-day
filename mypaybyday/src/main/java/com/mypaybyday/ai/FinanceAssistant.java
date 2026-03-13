package com.mypaybyday.ai;

import dev.langchain4j.service.MemoryId;
import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import io.quarkiverse.langchain4j.RegisterAiService;
import jakarta.enterprise.context.ApplicationScoped;

@RegisterAiService(tools = FinanceAssistantTools.class)
@ApplicationScoped
public interface FinanceAssistant {

    @SystemMessage("{systemPrompt}")
    String chat(@MemoryId String chatId, @UserMessage String userMessage, String systemPrompt);
}
