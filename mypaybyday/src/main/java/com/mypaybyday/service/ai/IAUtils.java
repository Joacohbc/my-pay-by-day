package com.mypaybyday.service.ai;

import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.inject.Named;

import com.mypaybyday.dto.FinanceEventExtractionDto;
import com.mypaybyday.i18n.LanguageContext;
import dev.langchain4j.agent.tool.Tool;
import dev.langchain4j.agent.tool.ToolSpecification;
import dev.langchain4j.agent.tool.ToolSpecifications;
import dev.langchain4j.data.image.Image;
import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.Content;
import dev.langchain4j.data.message.ImageContent;
import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.data.message.TextContent;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.response.ChatResponse;
import dev.langchain4j.service.AiServices;
import dev.langchain4j.service.MemoryId;
import dev.langchain4j.service.V;
import dev.langchain4j.service.tool.DefaultToolExecutor;
import dev.langchain4j.service.tool.ToolExecutor;
import org.jboss.logging.Logger;

@ApplicationScoped
public class IAUtils {

	private static final Logger log = Logger.getLogger(IAUtils.class);

	/** Context for handling multi-language support and user language preferences. */
	private final LanguageContext languageContext;

	/** The main language model used for text generation and processing. */
	private final ChatModel primaryModel;

	/** A language model specialized in processing and analyzing image data. */
	private final ChatModel visionModel;

	/** In-memory storage for maintaining conversation context and history. */
	private final ChatMemoryOnRAM chatMemoryOnRAM;

	/** Set of tools that enable the AI to interact with the application's domain logic. */
	private final FinanceAiTools financeAiTools;

	private ChatAgent chatAgent;

	@Inject
	public IAUtils(
			LanguageContext languageContext,
			@Named("primaryChatModel") ChatModel primaryModel,
			@Named("visionChatModel") ChatModel visionModel,
			ChatMemoryOnRAM chatMemoryOnRAM,
			FinanceAiTools financeAiTools) {
		this.languageContext = languageContext;
		this.primaryModel = primaryModel;
		this.visionModel = visionModel;
		this.chatMemoryOnRAM = chatMemoryOnRAM;
		this.financeAiTools = financeAiTools;
	}

	@PostConstruct
	void init() {
		Map<ToolSpecification, ToolExecutor> toolMap = buildToolMap(financeAiTools, FinanceAiTools.class);
		this.chatAgent = AiServices.builder(ChatAgent.class)
				.chatModel(primaryModel)
				.tools(toolMap)
				.chatMemoryProvider(chatMemoryOnRAM.get())
				.build();
	}

	private static Map<ToolSpecification, ToolExecutor> buildToolMap(Object toolInstance, Class<?> toolClass) {
		Map<ToolSpecification, ToolExecutor> map = new LinkedHashMap<>();
		for (Method method : toolClass.getDeclaredMethods()) {
			if (method.isAnnotationPresent(Tool.class)) {
				ToolSpecification spec = ToolSpecifications.toolSpecificationFrom(method);
				map.put(spec, new DefaultToolExecutor(toolInstance, method));
			}
		}
		return map;
	}

	public Image buildImage(String base64Data, String mimeType) {
		return Image.builder()
			.base64Data(base64Data)
			.mimeType(mimeType)
			.build();
	}

	public String describeImages(List<Image> images) {
		String now = LocalDateTime.now().toString();
		String lang = languageContext.getLang();
		return viewImages(PromptCollection.getSystemImages(now, lang), images);
	}

	public String processImages(String chatId, List<Image> images, String text) {
		String now = LocalDateTime.now().toString();
		String lang = languageContext.getLang();
		String desc = viewImages(PromptCollection.getSystemImages(now, lang), images);
		log.infof("Description: %s", desc);
		String message = (text != null && !text.isBlank() ? "USER TEXT: " + text + "\n\n" : "") +
						"IMAGE DESCRIPTIONS:\n-----------------------\n" + desc + "\n-----------------------\n";
		return processText(chatId, message);
	}

	public String processText(String chatId, String text) {
		String now = LocalDateTime.now().toString();
		String lang = languageContext.getLang();
		String prompt = PromptCollection.getSystemChat(now, lang);
		return chatAgent.chat(chatId, prompt, text);
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

	public FinanceEventExtractionDto extractEvent(String text, String systemPrompt) {
		return chatAgent.extractEvent(systemPrompt, text);
	}

	public String generateEventDescription(String originalText, String instructions, String lang) {
		String systemPrompt = PromptCollection.getSystemEventDescription(lang);

		if (instructions != null && !instructions.trim().isEmpty()) {
			systemPrompt += "\nADDITIONAL USER INSTRUCTIONS:\n" + instructions + "\n";
		}
		
		var systemMessage = SystemMessage.from(systemPrompt);
		var userMessage = UserMessage.from(originalText);
		ChatResponse response = primaryModel.chat(List.of(systemMessage, userMessage));
		return response.aiMessage().text();
	}

	interface ChatAgent {
		@dev.langchain4j.service.SystemMessage("{systemMessage}")
		String chat(@MemoryId String chatId, @V("systemMessage") String systemMessage, @dev.langchain4j.service.UserMessage String userMessage);

		@dev.langchain4j.service.SystemMessage("{systemPrompt}")
		FinanceEventExtractionDto extractEvent(@V("systemPrompt") String systemPrompt, @dev.langchain4j.service.UserMessage String text);
	}
}
