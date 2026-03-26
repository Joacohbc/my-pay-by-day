package com.mypaybyday.ai;

import dev.langchain4j.service.MemoryId;
import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.data.message.UserMessage;
import io.quarkiverse.langchain4j.RegisterAiService;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
@RegisterAiService(
    tools = FinanceAiTools.class,
    chatMemoryProviderSupplier = ChatMemoryOnRAM.class
)
public interface CreateFinanceEventService {
    @SystemMessage("{systemMessage}")
    String chat(@MemoryId String chatId, String systemMessage, UserMessage userMessage);
}
