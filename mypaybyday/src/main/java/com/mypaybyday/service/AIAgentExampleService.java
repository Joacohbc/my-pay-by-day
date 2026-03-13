package com.mypaybyday.service;

import com.mypaybyday.ai.FinanceAssistant;
import com.mypaybyday.i18n.LanguageContext;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.time.LocalDateTime;

/**
 * Example service demonstrating how to "call the model from other methods".
 * In Quarkus with LangChain4j, your AI Service is just another CDI bean.
 */
@ApplicationScoped
public class AIAgentExampleService {

    private static final Logger LOG = Logger.getLogger(AIAgentExampleService.class);

    @Inject
    FinanceAssistant financeAssistant;

    @Inject
    Messages messages;

    @Inject
    LanguageContext languageContext;

    /**
     * This method acts as an "Agent" by deciding when to call the AI
     * and what to do with its response within business logic.
     */
    public void processAutoCategorization(String description) {
        LOG.info("AI Agent starting processing for: " + description);

        // We can define a specific system prompt for this internal agent
        String internalSystemPrompt = messages.get(
                MsgKey.AI_SYSTEM_PROMPT,
                LocalDateTime.now().toString(),
                languageContext.getLang(),
                "", // No tools for this specific check maybe
                "");

        // Calling the model is as simple as calling a method on the injected service
        String analysis = financeAssistant.chat(
                "internal-agent-task",
                "Identify the category for this expense description: " + description,
                internalSystemPrompt);

        LOG.info("AI Agent analysis result: " + analysis);

        // Use the analysis further in your business logic...
    }
}
