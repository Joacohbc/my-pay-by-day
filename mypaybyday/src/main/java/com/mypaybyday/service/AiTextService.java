package com.mypaybyday.service;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.inject.Named;

import com.mypaybyday.dto.AiTextRequestDto;
import com.mypaybyday.dto.AiTextResponseDto;
import com.mypaybyday.enums.AiTextAction;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.LanguageContext;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.response.ChatResponse;

@ApplicationScoped
public class AiTextService {

    private final ChatModel primaryModel;
    private final LanguageContext languageContext;
    private final Messages messages;

    @Inject
    public AiTextService(
            @Named("primaryChatModel") ChatModel primaryModel,
            LanguageContext languageContext,
            Messages messages) {
        this.primaryModel = primaryModel;
        this.languageContext = languageContext;
        this.messages = messages;
    }

    public AiTextResponseDto generate(AiTextRequestDto request) throws BusinessException {
        String lang = languageContext.getLang();
        String systemPrompt = buildSystemPrompt(request.getAction(), lang, request.getCustomPrompt());
        String userMessage = buildUserMessage(request);

        try {
            ChatResponse response = primaryModel.chat(
                    List.of(SystemMessage.from(systemPrompt), UserMessage.from(userMessage)));
            return new AiTextResponseDto(response.aiMessage().text().trim());
        } catch (Exception e) {
            throw new BusinessException(messages.get(MsgKey.AI_TEXT_GENERATION_FAILED));
        }
    }

    private String buildSystemPrompt(AiTextAction action, String lang, String customPrompt) {
        String basePrompt = resolveBasePrompt(action, lang, customPrompt);
        return basePrompt + """

OUTPUT RULES:
- Return ONLY the plain text result — no markdown, no quotes, no explanations.
- The result must be written in %s.
- Keep the output concise and appropriate for a form field.
""".formatted(lang);
    }

    private String resolveBasePrompt(AiTextAction action, String lang, String customPrompt) {
        if (customPrompt != null && !customPrompt.isBlank()) {
            return customPrompt.formatted(lang);
        }

        return switch (action) {
            case GENERATE_NAME -> """
You are a personal finance assistant. Generate a concise, descriptive name for a financial entity
(event, category, tag, template, or account) based on the context provided by the user.
The name must be short (2-6 words), human-readable, and written in %s.
""".formatted(lang);

            case GENERATE_DESCRIPTION -> """
You are a personal finance assistant. Generate a brief, clear description (1-2 sentences) for a
financial entity (event, category, tag, template, or account) based on the context provided.
Be informative and natural. Write in %s.
""".formatted(lang);

            case FIX_NAME_SPELLING -> """
You are a spelling and grammar corrector for a personal finance application.
Fix any spelling mistakes, grammar errors, or typos in the provided name.
Keep the same meaning and length. Write in %s.
""".formatted(lang);

            case FIX_DESCRIPTION_SPELLING -> """
You are a spelling and grammar corrector for a personal finance application.
Fix any spelling mistakes, grammar errors, or typos in the provided description.
Keep the same meaning. Write in %s.
""".formatted(lang);

            case MERGE_DESCRIPTION -> """
You are a personal finance assistant. You are given multiple descriptions from financial events
that are being merged into one. Your task is to produce a single, coherent description (1-3 sentences)
that summarises the combined purpose or nature of all the events.
Do not list the events separately — blend them into one natural description.
Write in %s.
""".formatted(lang);
        };
    }

    private String buildUserMessage(AiTextRequestDto request) {
        StringBuilder sb = new StringBuilder();

        if (request.getContext() != null && !request.getContext().isBlank()) {
            sb.append("CONTEXT:\n").append(request.getContext()).append("\n\n");
        }

        if (request.getCurrentValue() != null && !request.getCurrentValue().isBlank()) {
            sb.append("CURRENT VALUE:\n").append(request.getCurrentValue()).append("\n\n");
        }

        sb.append("Generate the result now.");
        return sb.toString();
    }
}
