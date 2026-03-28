package com.mypaybyday.service;

import com.mypaybyday.ai.AgentFinanceEventCreator;
import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.FinanceEventExtractionDto;
import com.mypaybyday.dto.RawTextEventRequestDto;
import com.mypaybyday.entity.Category;
import com.mypaybyday.entity.FinanceEvent;
import com.mypaybyday.entity.FinanceLineItem;
import com.mypaybyday.entity.FinanceNode;
import com.mypaybyday.entity.FinanceTransaction;
import com.mypaybyday.enums.EventType;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.LanguageContext;
import com.mypaybyday.dto.IntelligentEventResponseDto;
import com.mypaybyday.enums.EntityType;
import com.mypaybyday.repository.CategoryRepository;
import com.mypaybyday.repository.FinanceNodeRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.jboss.logging.Logger;

@ApplicationScoped
public class IntelligentEventService {

    private static final Logger log = Logger.getLogger(IntelligentEventService.class);

    private final AgentFinanceEventCreator agentFinanceEventCreator;
    private final EventService eventService;
    private final EntityDraftService draftService;
    private final LanguageContext languageContext;
    private final FinanceNodeRepository financeNodeRepository;
    private final CategoryRepository categoryRepository;

    @Inject
    public IntelligentEventService(AgentFinanceEventCreator agentFinanceEventCreator, EventService eventService,
            EntityDraftService draftService, LanguageContext languageContext,
            FinanceNodeRepository financeNodeRepository, CategoryRepository categoryRepository) {
        this.agentFinanceEventCreator = agentFinanceEventCreator;
        this.eventService = eventService;
        this.draftService = draftService;
        this.languageContext = languageContext;
        this.financeNodeRepository = financeNodeRepository;
        this.categoryRepository = categoryRepository;
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
                "Extract the transaction details from the user's text using the context provided above.\n\n" +
                "RULES FOR FIELDS:\n" +
                "- name: Must be a descriptive and meaningful title. Include the business/service name and context (e.g., 'Dinner at Burger King', 'Monthly Salary from TechCorp').\n" +
                "- amount: Total absolute amount of the transaction. Always positive, no currency symbols.\n" +
                "- sourceNodeId: The ID of the node where money comes FROM. Pick from the AVAILABLE FINANCE NODES list above.\n" +
                "- destinationNodeId: The ID of the node where money goes TO. Pick from the AVAILABLE FINANCE NODES list above.\n" +
                "- categoryId: The ID of the most appropriate category from the AVAILABLE CATEGORIES list above. Null if unclear.\n" +
                "- transactionDate: The date in YYYY-MM-DD format. Extract from text if present, otherwise leave null.\n\n" +
                "CRITICAL OUTPUT RULES:\n" +
                "- Return ONLY valid JSON matching the expected schema.\n" +
                "- Do NOT include conversational text, greetings, explanations, or any markdown formatting (no ```json).\n" +
                "- If the text lacks meaningful transaction data, return a JSON with null fields rather than an error message.\n\n";

        if (request.getInstructions() != null && !request.getInstructions().trim().isEmpty()) {
            extractionPrompt += "ADDITIONAL USER INSTRUCTIONS:\n" + request.getInstructions() + "\n\n";
        }

        extractionPrompt += "Now process the user request.";

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

        // Map the extracted DTO to the entities
        FinanceEvent event = new FinanceEvent();
        event.name = extraction.getName();
        event.description = "Created intelligently from: " + request.getText();
        event.type = EventType.OUTBOUND;

        // Map Category
        if (extraction.getCategoryId() != null) {
            Category category = new Category();
            category.id = extraction.getCategoryId();
            event.category = category;
        }

        // Map Transaction and Line Items
        FinanceTransaction transaction = new FinanceTransaction();

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

        List<FinanceLineItem> lineItems = new ArrayList<>();
        BigDecimal amount = extraction.getAmount();
        boolean amountOk = amount != null && amount.compareTo(BigDecimal.ZERO) > 0;

        // Always create Source Line Item
        FinanceLineItem sourceItem = new FinanceLineItem();
        if (amountOk) {
            sourceItem.setAmount(amount.negate());
        }

        if (extraction.getSourceNodeId() != null) {
            FinanceNode sourceNode = new FinanceNode();
            sourceNode.id = extraction.getSourceNodeId();
            sourceItem.financeNode = sourceNode;
        }

        sourceItem.transaction = transaction;
        lineItems.add(sourceItem);

        // Always create Destination Line Item
        FinanceLineItem destItem = new FinanceLineItem();
        if (amountOk) {
            destItem.setAmount(amount);
        }

        if (extraction.getDestinationNodeId() != null) {
            FinanceNode destNode = new FinanceNode();
            destNode.id = extraction.getDestinationNodeId();
            destItem.financeNode = destNode;
        }

        destItem.transaction = transaction;
        lineItems.add(destItem);

        transaction.lineItems = lineItems;

        // Delegate persistence and validation to the existing service
        try {
            FinanceEventDto eventDto = eventService.create(event);
            log.infof("Event created for intelligent event: %s", eventDto.name());
            return IntelligentEventResponseDto.builder()
                    .type(IntelligentEventResponseDto.ResponseType.EVENT)
                    .event(eventDto)
                    .build();
        } catch (Exception e) {
            log.warnf("Intelligent event creation failed, falling back to draft. Error: %s", e.getMessage());
            return createDraftFallback(FinanceEventDto.from(event));
        }
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
            throw new BusinessException("Could not create event or draft from the provided text.");
        }
    }

    private String buildNodesContext() {
        List<FinanceNode> nodes = financeNodeRepository.find("archived", false).list();
        if (nodes.isEmpty()) {
            return "No finance nodes available.";
        }
        return nodes.stream()
                .map(n -> String.format("  - id=%d, name=%s, type=%s", n.id, n.name, n.type))
                .collect(Collectors.joining("\n"));
    }

    private String buildCategoriesContext() {
        List<Category> categories = categoryRepository.listAll();
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
1. **FinanceEvent**: The financial transaction.
2. **FinanceNode**: Any entity that holds, sends, or receives money.
3. **Category**: Budget classification bucket.

STRICT EXTRACTION RULES:
1. NEVER reply with conversational text, greetings, apologies, or explanations. Just output the structured data.
2. NEVER use markdown formatting like ```json or ```.
3. IF the user's text DOES NOT contain a recognizable financial transaction, output empty/null fields instead of a conversational error.
4. Your output will be consumed directly by a JSON parser. Any conversational text will cause a Fatal System Crash.
""".formatted(now, lang);
    }
}
