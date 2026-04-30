package com.mypaybyday.service.ai;

import java.time.LocalDateTime;
import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.inject.Named;

import com.mypaybyday.i18n.LanguageContext;
import dev.langchain4j.data.image.Image;
import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.Content;
import dev.langchain4j.data.message.ImageContent;
import dev.langchain4j.data.message.PdfFileContent;
import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.data.message.TextContent;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.response.ChatResponse;

@ApplicationScoped
public class IAUtils {

    private final LanguageContext languageContext;
    private final ChatModel primaryModel;
    private final ChatModel visionModel;

    @Inject
    public IAUtils(
            LanguageContext languageContext,
            @Named("primaryChatModel") ChatModel primaryModel,
            @Named("visionChatModel") ChatModel visionModel) {
        this.languageContext = languageContext;
        this.primaryModel = primaryModel;
        this.visionModel = visionModel;
    }

    public Image buildImage(String base64Data, String mimeType) {
        return Image.builder()
            .base64Data(base64Data)
            .mimeType(mimeType)
            .build();
    }

    public String describeImages(List<Image> images) {
        String now = LocalDateTime.now().toString();
        String lang = languageContext.getLanguageName();
        return viewImages(PromptCollection.getSystemImages(now, lang), images);
    }

    public String describePdf(String base64Data, String mimeType) {
        String now = LocalDateTime.now().toString();
        String lang = languageContext.getLanguageName();
        var systemMessage = SystemMessage.from(PromptCollection.getSystemImages(now, lang));
        var userMessage = UserMessage.from(
            TextContent.from("Please analyze this PDF document."),
            PdfFileContent.from(base64Data, mimeType)
        );
        ChatResponse response = visionModel.chat(List.of(systemMessage, userMessage));
        return response.aiMessage().text();
    }

    public String generateEventDescription(String originalText, String instructions, String lang, String context) {
        String systemPrompt = PromptCollection.getSystemEventDescription(lang);

        if (instructions != null && !instructions.trim().isEmpty()) {
            systemPrompt += "\nADDITIONAL USER INSTRUCTIONS:\n" + instructions + "\n";
        }

        if (context != null && !context.trim().isEmpty()) {
            systemPrompt += "\nEXTRACTED DATA CONTEXT (use this to provide specific details):\n" + context + "\n";
        }

        var systemMessage = SystemMessage.from(systemPrompt);
        var userMessage = UserMessage.from(originalText);
        ChatResponse response = primaryModel.chat(List.of(systemMessage, userMessage));
        return response.aiMessage().text();
    }

    private String viewImages(String systemPrompt, List<Image> images) {
        var systemMessage = SystemMessage.from(systemPrompt);
        List<Content> contents = new java.util.ArrayList<>();
        contents.add(TextContent.from("Please analyze these images."));
        for (Image img : images) {
            contents.add(ImageContent.from(img));
        }
        var userMessage = UserMessage.from(contents);
        List<ChatMessage> messages = List.of(systemMessage, userMessage);
        ChatResponse response = visionModel.chat(messages);
        return response.aiMessage().text();
    }
}
