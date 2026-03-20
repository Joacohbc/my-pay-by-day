package com.mypaybyday.ai;

import dev.langchain4j.service.MemoryId;
import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.V;
import io.quarkiverse.langchain4j.RegisterAiService;
import jakarta.enterprise.context.ApplicationScoped;

@RegisterAiService
@ApplicationScoped
public interface FinanceAssistant {

    @SystemMessage("{systemPrompt}")
    String chat(@MemoryId String chatId, dev.langchain4j.data.message.UserMessage userMessage, @V("systemPrompt") String systemPrompt);
}
