package com.mypaybyday.ai;

import com.mypaybyday.dto.FinanceEventExtractionDto;
import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import io.quarkiverse.langchain4j.RegisterAiService;
import jakarta.enterprise.context.ApplicationScoped;

@RegisterAiService(retrievalAugmentor = FinanceRetrievalAugmentor.class)
@ApplicationScoped
public interface FinanceExtractor {

    @SystemMessage("{systemPrompt}")
    @UserMessage("Extract a finance event from the following text: {text}")
    FinanceEventExtractionDto extractEvent(String text, String systemPrompt);
}
