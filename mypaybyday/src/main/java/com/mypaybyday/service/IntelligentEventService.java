package com.mypaybyday.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.ai.AgentFinanceEventCreator;
import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.FinanceEventExtractionDto;
import com.mypaybyday.dto.IntelligentEventResponseDto;
import com.mypaybyday.dto.RawTextEventRequestDto;
import com.mypaybyday.entity.CategoryEntity;
import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.entity.FinanceLineItemEntity;
import com.mypaybyday.entity.FinanceNodeEntity;
import com.mypaybyday.entity.FinanceTransactionEntity;
import com.mypaybyday.enums.EntityType;
import com.mypaybyday.enums.EventType;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.LanguageContext;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.CategoryRepository;
import com.mypaybyday.repository.FinanceNodeRepository;
import org.jboss.logging.Logger;

@ApplicationScoped
public class IntelligentEventService {

	private static final Logger log = Logger.getLogger(IntelligentEventService.class);

	private final AgentFinanceEventCreator agentFinanceEventCreator;
	private final DraftService draftService;
	private final LanguageContext languageContext;
	private final FinanceNodeRepository financeNodeRepository;
	private final CategoryRepository categoryRepository;
	private final Messages messages;

	public IntelligentEventService(AgentFinanceEventCreator agentFinanceEventCreator,
			DraftService draftService, LanguageContext languageContext,
			FinanceNodeRepository financeNodeRepository, CategoryRepository categoryRepository,
			Messages messages) {
		this.agentFinanceEventCreator = agentFinanceEventCreator;
		this.draftService = draftService;
		this.languageContext = languageContext;
		this.financeNodeRepository = financeNodeRepository;
		this.categoryRepository = categoryRepository;
		this.messages = messages;
	}

	public IntelligentEventResponseDto createFromText(RawTextEventRequestDto request) throws BusinessException {
		String systemPrompt = buildSystemPrompt(LocalDateTime.now().toString(), languageContext.getLang());

		// Pre-fetch context so the LLM can pick IDs without needing tool calls
		// (tool-calling and structured POJO output are mutually exclusive in LangChain4j)
		String nodesContext = buildNodesContext();
		String categoriesContext = buildCategoriesContext();

		String extractionPrompt = systemPrompt + "\n\n" +
				"AVAILABLE FINANCE NODES (pick sourceNodeId and destinationNodeId from these):\n" +
				nodesContext + "\n\n" +
				"AVAILABLE CATEGORIES (pick categoryId from these):\n" +
				categoriesContext + "\n\n" +
				"TASK:\n" +
				"Extract the transaction details from the user's text using the context provided above.\n\n";

		if (request.getInstructions() != null && !request.getInstructions().trim().isEmpty()) {
			extractionPrompt += "ADDITIONAL USER INSTRUCTIONS (HIGHEST PRIORITY — these override the default rules below):\n" +
					request.getInstructions() + "\n\n";
		}

		extractionPrompt +=
				"DEFAULT RULES FOR FIELDS (apply these unless overridden by ADDITIONAL USER INSTRUCTIONS above):\n" +
				"- name: Must be a descriptive and meaningful title. Include the business/service name and context (e.g., 'Dinner at Burger King', 'Monthly Salary from TechCorp').\n" +
				"- amount: Total absolute amount of the transaction. Always positive, no currency symbols.\n" +
				"- sourceNodeId: The ID of the node where money comes FROM. Pick from the AVAILABLE FINANCE NODES list above.\n" +
				"- destinationNodeId: The ID of the node where money goes TO. Pick from the AVAILABLE FINANCE NODES list above.\n" +
				"- categoryId: The ID of the most appropriate category from the AVAILABLE CATEGORIES list above. Null if unclear.\n" +
				"- transactionDate: The date in YYYY-MM-DD format. Extract from text if present, otherwise leave null.\n\n" +
				"CRITICAL OUTPUT RULES:\n" +
				"- Return ONLY valid JSON matching the expected schema.\n" +
				"- Do NOT include conversational text, greetings, explanations, or any markdown formatting (no ```json).\n" +
				"- If the text lacks meaningful transaction data, return a JSON with null fields rather than an error message.\n\n" +
				"Now process the user request.";

		// Call the Langchain4j structured output extraction
		FinanceEventExtractionDto extraction = agentFinanceEventCreator.extractEvent(request.getText(), extractionPrompt);

		log.infof("AI extracted event from text: '%s'. Result: name=%s, amount=%s, sourceNodeId=%s, destinationNodeId=%s, categoryId=%s, date=%s",
			request.getText(),
			extraction.getName(),
			extraction.getAmount(),
			extraction.getSourceNodeId(),
			extraction.getDestinationNodeId(),
			extraction.getCategoryId(),
			extraction.getTransactionDate()
		);

		String description = agentFinanceEventCreator.generateDescription(request.getText(), request.getInstructions(), languageContext.getLang());
		log.infof("AI generated description: %s", description);

		// Map the extracted DTO to the entities
		FinanceEventEntity event = new FinanceEventEntity();
		event.name = extraction.getName();
		event.description = description;
		event.type = EventType.OUTBOUND;

		// Map CategoryEntity
		if (extraction.getCategoryId() != null) {
			CategoryEntity category = new CategoryEntity();
			category.id = extraction.getCategoryId();
			event.category = category;
		}

		// Map Transaction and Line Items
		FinanceTransactionEntity transaction = new FinanceTransactionEntity();

		// Parse the extracted date
		LocalDateTime transactionDate = LocalDateTime.now();
		if (extraction.getTransactionDate() != null) {
			try {
				// Assuming format YYYY-MM-DD from AI extraction prompt, default to start of day
				transactionDate = LocalDate.parse(
					extraction.getTransactionDate(),
					DateTimeFormatter.ISO_LOCAL_DATE
				).atStartOfDay();
			} catch (Exception e) {
				// If parsing fails, stick with current time
			}
		}
		transaction.transactionDate = transactionDate;
		event.transaction = transaction;

		List<FinanceLineItemEntity> lineItems = new ArrayList<>();
		BigDecimal amount = extraction.getAmount();
		boolean amountOk = amount != null && amount.compareTo(BigDecimal.ZERO) > 0;

		// Always create Source Line Item
		FinanceLineItemEntity sourceItem = new FinanceLineItemEntity();
		if (amountOk) {
			sourceItem.setAmount(amount.negate());
		}

		if (extraction.getSourceNodeId() != null) {
			FinanceNodeEntity sourceNode = new FinanceNodeEntity();
			sourceNode.id = extraction.getSourceNodeId();
			sourceItem.financeNode = sourceNode;
		}

		sourceItem.transaction = transaction;
		lineItems.add(sourceItem);

		// Always create Destination Line Item
		FinanceLineItemEntity destItem = new FinanceLineItemEntity();
		if (amountOk) {
			destItem.setAmount(amount);
		}

		if (extraction.getDestinationNodeId() != null) {
			FinanceNodeEntity destNode = new FinanceNodeEntity();
			destNode.id = extraction.getDestinationNodeId();
			destItem.financeNode = destNode;
		}

		destItem.transaction = transaction;
		lineItems.add(destItem);

		transaction.lineItems = lineItems;

		// Always create a Draft as requested by user logic
		FinanceEventDto eventDto = FinanceEventDto.from(event);
		log.infof("Delegating to createDraftFallback for event: %s", eventDto.name());
		return createDraftFallback(eventDto);
	}

	private IntelligentEventResponseDto createDraftFallback(FinanceEventDto dto) {
		try {
			draftService.create(EntityType.FINANCE_EVENT, dto);
			log.infof("Draft created for intelligent event: %s", dto.name());
			return IntelligentEventResponseDto.builder()
					.type(IntelligentEventResponseDto.ResponseType.DRAFT)
					.event(dto)
					.build();
		} catch (Exception e) {
			log.error("Critical failure: Could not even create a draft for the intelligent event", e);
			throw new BusinessException(messages.get(MsgKey.INTELLIGENT_EVENT_DRAFT_CREATION_FAILED));
		}
	}

	private String buildNodesContext() {
		List<FinanceNodeEntity> nodes = financeNodeRepository.find("archived", false).list();
		if (nodes.isEmpty()) {
			return "No finance nodes available.";
		}
		return nodes.stream()
				.map(n -> String.format("  - id=%d, name=%s, type=%s", n.id, n.name, n.type))
				.collect(Collectors.joining("\n"));
	}

	private String buildCategoriesContext() {
		List<CategoryEntity> categories = categoryRepository.listAll();
		if (categories.isEmpty()) {
			return "No categories available.";
		}
		return categories.stream()
				.map(c -> String.format("  - id=%d, name=%s", c.id, c.name))
				.collect(Collectors.joining("\n"));
	}

	private static String buildSystemPrompt(String now, String lang) {
		return """
You are a highly precise data extraction AI for a personal finance system.
Your ONLY task is to extract structured financial transaction details from the user's text and map them to our internal IDs.

CONTEXT:
- Current system date and time: %s
- User's primary language: %s

DATA MODEL OVERVIEW:
1. **FinanceEventEntity**: The financial transaction.
2. **FinanceNodeEntity**: Any entity that holds, sends, or receives money.
3. **CategoryEntity**: Budget classification bucket.

STRICT EXTRACTION RULES:
1. NEVER reply with conversational text, greetings, apologies, or explanations. Just output the structured data.
2. NEVER use markdown formatting like ```json or ```.
3. IF the user's text DOES NOT contain a recognizable financial transaction, output empty/null fields instead of a conversational error.
4. Your output will be consumed directly by a JSON parser. Any conversational text will cause a Fatal System Crash.
5. All text fields in the output (e.g. 'name') MUST be written in the user's primary language indicated above.
""".formatted(now, lang);
	}
}
