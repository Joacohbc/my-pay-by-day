package com.mypaybyday.service.agent;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Named;

import com.mypaybyday.i18n.LanguageContext;
import com.mypaybyday.i18n.TimezoneContext;
import com.mypaybyday.service.ai.DbChatMemoryStore;
import com.mypaybyday.service.ai.FinanceAiTools;
import com.mypaybyday.service.ai.IAUtils;
import com.mypaybyday.service.ai.PromptCollection;

import dev.langchain4j.agent.tool.Tool;
import dev.langchain4j.agent.tool.ToolSpecification;
import dev.langchain4j.agent.tool.ToolSpecifications;
import dev.langchain4j.data.image.Image;
import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.TextContent;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.service.AiServices;
import dev.langchain4j.service.MemoryId;
import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.V;
import dev.langchain4j.service.tool.DefaultToolExecutor;
import dev.langchain4j.service.tool.ToolExecutor;
import org.jboss.logging.Logger;

@ApplicationScoped
public class ChatService {

    private static final Logger log = Logger.getLogger(ChatService.class);
    private static final int MAX_CHAT_MESSAGES = 50;

    private final ChatModel primaryChatModel;
    private final DbChatMemoryStore dbChatMemoryStore;
    private final FinanceAiTools financeAiTools;
    private final IAUtils iaUtils;
    private final LanguageContext languageContext;
    private final TimezoneContext timezoneContext;
    private final DateConversionTool dateConversionTool;

    public ChatService(
            @Named("primaryChatModel") ChatModel primaryChatModel,
            DbChatMemoryStore dbChatMemoryStore,
            FinanceAiTools financeAiTools,
            IAUtils iaUtils,
            LanguageContext languageContext,
            TimezoneContext timezoneContext,
            DateConversionTool dateConversionTool) {
        this.primaryChatModel = primaryChatModel;
        this.dbChatMemoryStore = dbChatMemoryStore;
        this.financeAiTools = financeAiTools;
        this.iaUtils = iaUtils;
        this.languageContext = languageContext;
        this.timezoneContext = timezoneContext;
        this.dateConversionTool = dateConversionTool;
    }

    public String processText(String chatId, String text) {
        String timezone = timezoneContext.getTimezone();
        String now = DateConversionTool.formatNow(timezone);
        String lang = languageContext.getLang();
        ChatRunner chatRunner = buildChatRunner(timezone);
        return chatRunner.chat(chatId, PromptCollection.getSystemChat(now, lang), text);
    }

    public String processImages(String chatId, List<Image> images, String text) {
        String desc = iaUtils.describeImages(images);
        log.infof("Image description for chatId=%s: %s", chatId, desc);
        String message = (text != null && !text.isBlank() ? "USER TEXT: " + text + "\n\n" : "") +
                "IMAGE DESCRIPTIONS:\n-----------------------\n" + desc + "\n-----------------------\n";
        return processText(chatId, message);
    }

    public void clearMemory(String chatId) {
        log.infof("Clearing DB memory for chatId: %s", chatId);
        dbChatMemoryStore.deleteMessages(chatId);
    }

    public void trimMemory(String chatId, String textToMatch) {
        List<ChatMessage> messages = dbChatMemoryStore.getMessages(chatId);
        int trimIndex = -1;
        for (int i = messages.size() - 1; i >= 0; i--) {
            ChatMessage msg = messages.get(i);
            if (msg instanceof UserMessage um) {
                String text = "";
                if (um.contents() != null) {
                    for (var c : um.contents()) {
                        if (c instanceof TextContent tc) {
                            text += tc.text();
                        }
                    }
                }
                if (text.contains(textToMatch)) {
                    trimIndex = i;
                    break;
                }
            }
        }
        if (trimIndex >= 0) {
            log.infof("Trimming DB memory for chatId=%s from index %d", chatId, trimIndex);
            dbChatMemoryStore.updateMessages(chatId, new ArrayList<>(messages.subList(0, trimIndex)));
        }
    }

    private ChatRunner buildChatRunner(String timezone) {
        Map<ToolSpecification, ToolExecutor> map = new LinkedHashMap<>();

        for (Method method : DateConversionTool.class.getDeclaredMethods()) {
            if (method.isAnnotationPresent(Tool.class)) {
                map.put(ToolSpecifications.toolSpecificationFrom(method),
                        new DefaultToolExecutor(dateConversionTool, method));
            }
        }

        for (Method method : FinanceAiTools.class.getDeclaredMethods()) {
            if (method.isAnnotationPresent(Tool.class)) {
                map.put(ToolSpecifications.toolSpecificationFrom(method),
                        new DefaultToolExecutor(financeAiTools, method));
            }
        }

        return AiServices.builder(ChatRunner.class)
                .chatModel(primaryChatModel)
                .tools(map)
                .chatMemoryProvider(id -> MessageWindowChatMemory.builder()
                        .chatMemoryStore(dbChatMemoryStore)
                        .maxMessages(MAX_CHAT_MESSAGES)
                        .id(id)
                        .build())
                .build();
    }

    interface ChatRunner {
        @SystemMessage("{systemMessage}")
        String chat(
                @MemoryId String chatId,
                @V("systemMessage") String systemMessage,
                @dev.langchain4j.service.UserMessage String userMessage);
    }
}
