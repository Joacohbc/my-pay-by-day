package com.mypaybyday.service;

import com.mypaybyday.i18n.TimezoneContext;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Named;

import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.FinanceEventExtractionDto;
import com.mypaybyday.dto.IntelligentEventResponseDto;
import com.mypaybyday.dto.RawTextEventRequestDto;
import com.mypaybyday.entity.CategoryEntity;
import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.entity.FinanceLineItemEntity;
import com.mypaybyday.entity.FinanceNodeEntity;
import com.mypaybyday.entity.FinanceTransactionEntity;
import com.mypaybyday.entity.TagEntity;
import com.mypaybyday.enums.EntityType;
import com.mypaybyday.enums.EventType;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.LanguageContext;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.service.agent.DateConversionTool;
import com.mypaybyday.service.ai.FinanceAiTools;
import com.mypaybyday.service.ai.IAUtils;
import com.mypaybyday.service.ai.PromptCollection;

import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.service.AiServices;
import dev.langchain4j.service.output.OutputParsingException;
import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.V;
import org.jboss.logging.Logger;

@ApplicationScoped
public class IntelligentEventService {

	private static final Logger log = Logger.getLogger(IntelligentEventService.class);

	private final IAUtils agentFinanceEventCreator;
	private final DraftService draftService;
	private final LanguageContext languageContext;
	private final TimezoneContext timezoneContext;
	private final FinanceAiTools financeAiTools;
	private final Messages messages;
	private final ChatModel primaryModel;
	private final DateConversionTool dateConversionTool;

	private ExtractionAgent extractionAgent;

	public IntelligentEventService(IAUtils agentFinanceEventCreator,
			DraftService draftService, LanguageContext languageContext,
			TimezoneContext timezoneContext,
			FinanceAiTools financeAiTools, Messages messages,
			@Named("primaryChatModel") ChatModel primaryModel,
			DateConversionTool dateConversionTool) {
		this.agentFinanceEventCreator = agentFinanceEventCreator;
		this.draftService = draftService;
		this.languageContext = languageContext;
		this.timezoneContext = timezoneContext;
		this.financeAiTools = financeAiTools;
		this.messages = messages;
		this.primaryModel = primaryModel;
		this.dateConversionTool = dateConversionTool;
	}

	@PostConstruct
	void init() {
		this.extractionAgent = AiServices.builder(ExtractionAgent.class)
				.chatModel(primaryModel)
				.tools(dateConversionTool)
				.build();
	}

	interface ExtractionAgent {
		@SystemMessage("{systemPrompt}")
		FinanceEventExtractionDto extractEvent(
				@V("systemPrompt") String systemPrompt,
				@UserMessage String text);
	}

	public IntelligentEventResponseDto createFromText(RawTextEventRequestDto request) throws BusinessException {
		ZoneId zoneId = ZoneId.of(timezoneContext.getTimezone());
		String now = DateConversionTool.formatNow(timezoneContext.getTimezone());
		String langName = languageContext.getLanguageName();

		// Pre-fetch context so the LLM can pick IDs without needing tool calls
		String nodesContext = financeAiTools.getFinanceNodes(null, false);
		String categoriesContext = financeAiTools.getCategories();
		String tagsContext = financeAiTools.getTags();

		String languageNote = PromptCollection.getSystemExtraction(now, langName);

		String instructions = "";
		if (request.getInstructions() != null && !request.getInstructions().trim().isEmpty()) {
			instructions = "ADDITIONAL USER INSTRUCTIONS (HIGHEST PRIORITY — these override the default rules below):\n" +
					request.getInstructions() + "\n";
		}

		String extractionPrompt = PromptCollection.getEventExtractionTemplate(
				languageNote,
				nodesContext,
				categoriesContext,
				tagsContext,
				instructions
		);

		// Call the Langchain4j structured output extraction
		FinanceEventExtractionDto extraction;
		try {
			extraction = extractionAgent.extractEvent(extractionPrompt, request.getText());
		} catch (OutputParsingException e) {
			throw new BusinessException(messages.get(MsgKey.INTELLIGENT_EVENT_MULTIPLE_TRANSACTIONS));
		}

		log.infof("AI extracted event from text: '%s'. Result: name=%s, amount=%s, sourceNodeId=%s, destinationNodeId=%s, category=%s, tags=%s, date=%s",
			request.getText(),
			extraction.getName(),
			extraction.getAmount(),
			extraction.getSourceNodeId(),
			extraction.getDestinationNodeId(),
			extraction.getCategory(),
			extraction.getTags(),
			extraction.getTransactionDate()
		);

		String extractionContext = String.format(
			"Result: name=%s, amount=%s, sourceNodeId=%s, destinationNodeId=%s, category=%s, tags=%s, date=%s",
			extraction.getName(),
			extraction.getAmount(),
			extraction.getSourceNodeId(),
			extraction.getDestinationNodeId(),
			extraction.getCategory() != null ? extraction.getCategory().getName() : "null",
			extraction.getTags(),
			extraction.getTransactionDate()
		);

		String description = agentFinanceEventCreator.generateEventDescription(request.getText(), request.getInstructions(), langName, extractionContext);
		log.infof("AI generated description: %s", description);

		// Map the extracted DTO to the entities
		FinanceEventEntity event = new FinanceEventEntity();
		event.name = extraction.getName();
		event.description = description;
		event.type = EventType.OUTBOUND;

		// Map CategoryEntity
		if (extraction.getCategory() != null && extraction.getCategory().getId() != null) {
			CategoryEntity category = new CategoryEntity();
			category.id = extraction.getCategory().getId();
			category.name = extraction.getCategory().getName();
			category.description = extraction.getCategory().getDescription();
			event.category = category;
		}

		// Map TagEntities
		if (extraction.getTags() != null && !extraction.getTags().isEmpty()) {
			event.tags = extraction.getTags().stream()
					.filter(t -> t.getId() != null)
					.map(t -> {
						TagEntity tag = new TagEntity();
						tag.id = t.getId();
						tag.name = t.getName();
						tag.description = t.getDescription();
						return tag;
					})
					.collect(Collectors.toSet());
		}

		// Map Transaction and Line Items
		FinanceTransactionEntity transaction = new FinanceTransactionEntity();

		// Parse the extracted date
		LocalDateTime transactionDate = LocalDateTime.now(zoneId);
		if (extraction.getTransactionDate() != null) {
			try {
				String dateStr = extraction.getTransactionDate();
				if (dateStr.contains("T")) {
					transactionDate = LocalDateTime.parse(dateStr, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
				} else {
					// Assuming format YYYY-MM-DD, default to start of day
					transactionDate = LocalDate.parse(dateStr, DateTimeFormatter.ISO_LOCAL_DATE).atStartOfDay();
				}
			} catch (Exception e) {
				// If parsing fails, stick with current time
				log.warnf("Failed to parse extracted transaction date: %s", extraction.getTransactionDate());
			}
		}
		// Convert from user's local timezone to server's timezone (UTC)
		java.time.ZonedDateTime userZdt = transactionDate.atZone(zoneId);
		java.time.ZonedDateTime serverZdt = userZdt.withZoneSameInstant(java.time.ZoneId.of("UTC"));
		transaction.transactionDate = serverZdt.toLocalDateTime();
		event.transaction = transaction;

		Set<FinanceLineItemEntity> lineItems = new HashSet<>();
		BigDecimal amount = extraction.getAmount();
		boolean amountOk = amount != null && amount.compareTo(BigDecimal.ZERO) > 0;

		// Always create Source Line Item
		FinanceLineItemEntity sourceItem = new FinanceLineItemEntity();
		if (amountOk && amount != null) {
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

}
