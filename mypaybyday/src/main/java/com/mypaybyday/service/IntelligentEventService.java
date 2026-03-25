package com.mypaybyday.service;

import com.mypaybyday.ai.FinanceExtractor;
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
import com.mypaybyday.entity.EntityDraft;
import com.mypaybyday.enums.EntityType;
import com.mypaybyday.repository.CategoryRepository;
import com.mypaybyday.repository.FinanceNodeRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

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

    private final FinanceExtractor financeExtractor;
    private final EventService eventService;
    private final EntityDraftService draftService;
    private final LanguageContext languageContext;
    private final FinanceNodeRepository financeNodeRepository;
    private final CategoryRepository categoryRepository;

    @Inject
    public IntelligentEventService(FinanceExtractor financeExtractor, EventService eventService,
            EntityDraftService draftService, LanguageContext languageContext,
            FinanceNodeRepository financeNodeRepository, CategoryRepository categoryRepository) {
        this.financeExtractor = financeExtractor;
        this.eventService = eventService;
        this.draftService = draftService;
        this.languageContext = languageContext;
        this.financeNodeRepository = financeNodeRepository;
        this.categoryRepository = categoryRepository;
    }

    @Transactional
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
                "Extract the transaction details from the user's text using the context provided above.\n" +
                "RULES FOR FIELDS:\n" +
                "- name: Must be a descriptive and meaningful title. Include the business/service name and context (e.g., 'Dinner at Burger King', 'Monthly Salary from TechCorp').\n" +
                "- amount: Total absolute amount of the transaction. Always positive, no currency symbols.\n" +
                "- sourceNodeId: The ID of the node where money comes FROM. Pick from the AVAILABLE FINANCE NODES list above.\n" +
                "- destinationNodeId: The ID of the node where money goes TO. Pick from the AVAILABLE FINANCE NODES list above.\n" +
                "- categoryId: The ID of the most appropriate category from the AVAILABLE CATEGORIES list above. Null if unclear.\n" +
                "- transactionDate: The date in YYYY-MM-DD format. Extract from text if present, otherwise leave null.\n" +
                "- IMPORTANT: Return ONLY valid JSON. Do not include conversational text, explanations, or markdown (no ```json).\n\n" +
                "EXAMPLE OUTPUT:\n" +
                "{ \"name\": \"Groceries at Supermarket\", \"amount\": 50.00, \"sourceNodeId\": 1, \"destinationNodeId\": 2, \"categoryId\": 5 }\n\n";

        if (request.getInstructions() != null && !request.getInstructions().trim().isEmpty()) {
            extractionPrompt += "ADDITIONAL USER INSTRUCTIONS:\n" + request.getInstructions() + "\n\n";
        }

        extractionPrompt += "Now process the user request.";

        // Call the Langchain4j structured output extraction
        FinanceEventExtractionDto extraction = financeExtractor.extractEvent(request.getText(), extractionPrompt);

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

        if(extraction.getSourceNodeId() != null) {
            FinanceLineItem sourceItem = new FinanceLineItem();

            if(amountOk) {
                sourceItem.setAmount(amount.negate());
            }

            FinanceNode sourceNode = new FinanceNode();
            sourceNode.id = extraction.getSourceNodeId();
            sourceItem.financeNode = sourceNode;
            sourceItem.transaction = transaction;
            lineItems.add(sourceItem);
        }

        if(extraction.getDestinationNodeId() != null) {
            FinanceLineItem destItem = new FinanceLineItem();

            if(amountOk) {
                destItem.setAmount(amount);
            }

            FinanceNode destNode = new FinanceNode();
            destNode.id = extraction.getDestinationNodeId();
            destItem.financeNode = destNode;
            destItem.transaction = transaction;
            lineItems.add(destItem);
        }

        transaction.lineItems = lineItems;

        // Delegate persistence and validation to the existing service
        try {
            FinanceEventDto eventDto = eventService.create(event);
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
                - getFinanceNodes(): Returns all active finance nodes (accounts, wallets, external entities, contacts) with their id, name, and type.
                - getCategories(): Returns all budget categories with id and name.
                - getTags(): Returns all tags with id and name.
                - getRecentEvents(limit): Returns the most recent N finance events with full detail (name, type, category, date, amounts, nodes involved).
                - getEventsByDateRange(from, to): Returns events within a date range (ISO-8601 format: 'YYYY-MM-DDTHH:mm:ss').
                - searchEvents(search, startDate, endDate, type, categoryId, tagId): Broad search for finance events with multiple filters. Use for complex queries like 'spending on restaurants last month' or 'expenses tagged #vacation'.
                - getTimePeriods(): Returns all budget time periods with their date ranges, limits, and savings goals.

                DATA MODEL:
                1. **FinanceEvent** — The main record (e.g. 'Dinner with friends', 'Paid Rent'). Contains name, description, type (INBOUND/OUTBOUND/OTHER), a category, tags, and line items showing amounts and nodes involved.
                2. **FinanceNode** — Any entity that can hold, send, or receive money:
                    - OWN: the user's own accounts (bank accounts, wallets, credit cards).
                    - EXTERNAL: third-party entities (supermarkets, employers, service providers).
                    - CONTACT: people (friends, family) — money here represents debts or loans.
                3. **Category** — A budget classification bucket (e.g. 'Food', 'Transport'). Every event is assigned to one category.
                4. **Tag** — A transversal label for cross-cutting grouping (e.g. '#Vacation2026', '#Reimbursable').
                5. **TimePeriod** — A budget container with a date range, a budget limit, and a savings goal percentage.

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
                7. PLAIN TEXT ONLY: Never use Markdown. No bold (**), no italics (*), no headers (#), no tables. Use empty lines or simple markers for formatting.
                """.formatted(now, lang);
    }
}
