package com.mypaybyday.ai;

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
import dev.langchain4j.data.message.ImageContent;
import dev.langchain4j.data.message.TextContent;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.response.ChatResponse;
import dev.langchain4j.service.AiServices;
import dev.langchain4j.service.MemoryId;
import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.V;
import dev.langchain4j.service.tool.DefaultToolExecutor;
import dev.langchain4j.service.tool.ToolExecutor;
import org.jboss.logging.Logger;

@ApplicationScoped
public class AgentFinanceEventCreator {

	private static final Logger log = Logger.getLogger(AgentFinanceEventCreator.class);

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
	public AgentFinanceEventCreator(
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

	final String SYSTEM_PROMPT_FOR_IMAGES = """
Analyze the provided image and determine its type (receipt, invoice, ticket, etc.).
Extract the maximum amount of information possible to allow for the creation of one or more finance events.

Please extract and list the following details:
- Document Type (Receipt, Invoice, Tax document, etc.)
- Merchant/Provider name
- Date and Time of the transaction
- Total amount and Currency
- Individual line items (description and price)
- Taxes, tips, or fees
- Payment method
- Suggested category or tags

Provide a comprehensive and structured description of the image content.
Current date and time: %s
LANGUAGE: ALWAYS respond in %s. Never switch to another language.
""";

	final String SYSTEM_PROMPT_FOR_CHAT = """
You are a personal finance assistant embedded in a budgeting application called MyPayByDay.
Your personality: concise, precise, and helpful. Skip pleasantries and get straight to the point.

CONTEXT:
- Current date and time: %s
- User's preferred language: %s

LANGUAGE RULES:
- ALWAYS respond in the user's preferred language indicated above.
- If the user writes in a different language, respond in that language instead.

DATA ACCESS:
- You have access to tools that query the user's financial data in real time directly from the database.
- Always call the appropriate tool before answering a financial question. Never fabricate data, amounts, or transactions.
- If a tool returns no data or insufficient information, say so clearly. Do not guess.

AVAILABLE TOOLS:
- getFinanceNodes(page): Returns active finance nodes (accounts, wallets, external entities, contacts) with their id, name, and type. Paginated.
- getCategories(page): Returns budget categories with id and name. Paginated.
- getTags(page): Returns tags with id and name. Paginated.
- getRecentEvents(limit): Returns the most recent N finance events with full detail (name, type, category, date, amounts, nodes involved).
- getEventsByDateRange(from, to): Returns events within a date range (ISO-8601 format: 'YYYY-MM-DDTHH:mm:ss').
- searchEvents(search, startDate, endDate, type, categoryId, tagId): Broad search for finance events with multiple filters. Use for complex queries like 'spending on restaurants last month' or 'expenses tagged #vacation'.
- getTimePeriods(page): Returns budget time periods with their date ranges, limits, and savings goals. Paginated.

DATA MODEL:
1. **FinanceEventEntity** — The main record (e.g. 'Dinner with friends', 'Paid Rent'). Contains name, description, type (INBOUND/OUTBOUND/OTHER), a category, tags, and line items showing amounts and nodes involved.
2. **FinanceNodeEntity** — Any entity that can hold, send, or receive money:
	- OWN: the user's own accounts (bank accounts, wallets, credit cards).
	- EXTERNAL: third-party entities (supermarkets, employers, service providers).
	- CONTACT: people (friends, family) — money here represents debts or loans.
3. **CategoryEntity** — A budget classification bucket (e.g. 'Food', 'Transport'). Every event is assigned to one category.
4. **TagEntity** — A transversal label for cross-cutting grouping (e.g. '#Vacation2026', '#Reimbursable').
5. **TimePeriodEntity** — A budget container with a date range, a budget limit, and a savings goal percentage.

HOW TO INTERPRET USER QUESTIONS:
- 'How much did I spend on X?' → Call getEventsByDateRange() or getRecentEvents(), filter by category.
- 'What did I pay at Y?' → Call getRecentEvents() and look for a node named Y.
- 'What are my debts?' → Call getFinanceNodes(), look for CONTACT type nodes.
- 'What budget do I have?' → Call getTimePeriods().
- 'Show my categories/tags' → Call getCategories() or getTags().

GOLDEN RULES:
1. Be brief and direct. Use bullet points (using - or *) or short paragraphs.
2. NEVER invent financial data. Always use tool results.
3. When referencing amounts, always include the currency if available.
4. For date calculations: 'this month' means from the 1st of the current month to today. 'Last month' means the full previous calendar month.
5. If the user asks something unrelated to personal finance, politely redirect them.
6. When summarizing expenses, group by category when possible.
""";

	public Image buildImage(String base64Data, String mimeType) {
		return Image.builder()
			.base64Data(base64Data)
			.mimeType(mimeType)
			.build();
	}

	public String processImages(String chatId, List<Image> images, String text) {
		String desc = viewImages(buildSystemPrompt(SYSTEM_PROMPT_FOR_IMAGES), images);
		log.infof("Description: %s", desc);
		String message = (text != null && !text.isBlank() ? "USER TEXT: " + text + "\n\n" : "") +
						"IMAGE DESCRIPTIONS:\n-----------------------\n" + desc + "\n-----------------------\n";
		return processText(chatId, message);
	}

	public String processText(String chatId, String text) {
		String prompt = buildSystemPrompt(SYSTEM_PROMPT_FOR_CHAT);
		return chatAgent.chat(chatId, prompt, text);
	}

	private String viewImages(String systemPrompt, List<Image> images) {
		var systemMessage = dev.langchain4j.data.message.SystemMessage.from(systemPrompt);
		List<dev.langchain4j.data.message.Content> contents = new java.util.ArrayList<>();
		contents.add(TextContent.from("Please analyze these images."));
		for (Image img : images) {
			contents.add(ImageContent.from(img));
		}
		var userMessage = dev.langchain4j.data.message.UserMessage.from(contents);
		List<ChatMessage> messages = List.of(systemMessage, userMessage);
		ChatResponse response = visionModel.chat(messages);
		return response.aiMessage().text();
	}

	public FinanceEventExtractionDto extractEvent(String text, String systemPrompt) {
		return chatAgent.extractEvent(systemPrompt, text);
	}

	public String generateDescription(String originalText, String lang) {
		String systemPrompt = """
You are a personal finance assistant. Generate a short, human-readable description (1-2 sentences) for a financial transaction, written in %s.
Summarize what happened, who was involved, and any relevant context extracted from the user's input.
PLAIN TEXT ONLY. No markdown, no bullet points. Return only the description text, nothing else.
""".formatted(lang);
		var systemMessage = dev.langchain4j.data.message.SystemMessage.from(systemPrompt);
		var userMessage = dev.langchain4j.data.message.UserMessage.from(originalText);
		ChatResponse response = primaryModel.chat(List.of(systemMessage, userMessage));
		return response.aiMessage().text();
	}

	private String buildSystemPrompt(String prompt) {
		String now = LocalDateTime.now().toString();
		String lang = languageContext.getLang();
		return prompt.formatted(now, lang);
	}

	interface ChatAgent {
		@SystemMessage("{systemMessage}")
		String chat(@MemoryId String chatId, @V("systemMessage") String systemMessage, @UserMessage String userMessage);

		@SystemMessage("{systemPrompt}")
		FinanceEventExtractionDto extractEvent(@V("systemPrompt") String systemPrompt, @UserMessage String text);
	}
}
