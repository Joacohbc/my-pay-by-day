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
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mypaybyday.dto.IntelligentEventResponseDto;
import com.mypaybyday.dto.FinanceEventDraftDto;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

import org.jboss.logging.Logger;

@ApplicationScoped
public class IntelligentEventService {

    private static final Logger log = Logger.getLogger(IntelligentEventService.class);

    private final FinanceExtractor financeExtractor;
    private final EventService eventService;
    private final FinanceEventDraftService draftService;
    private final LanguageContext languageContext;
    private final Messages messages;
    private final ObjectMapper objectMapper;

    @Inject
    public IntelligentEventService(FinanceExtractor financeExtractor, EventService eventService,
            FinanceEventDraftService draftService, LanguageContext languageContext, Messages messages,
            ObjectMapper objectMapper) {
        this.financeExtractor = financeExtractor;
        this.eventService = eventService;
        this.draftService = draftService;
        this.languageContext = languageContext;
        this.messages = messages;
        this.objectMapper = objectMapper;
    }

    public IntelligentEventResponseDto createFromText(RawTextEventRequestDto request) throws BusinessException {
        // Construct the AI context
        String systemPrompt = messages.get(MsgKey.AI_SYSTEM_PROMPT, LocalDateTime.now().toString(), languageContext.getLang());

        String extractionPrompt = systemPrompt + "\n\n" +
                "TASK:\n" +
                "Extract the transaction details using ONLY the IDs provided in the context.\n" +
                "RULES FOR FIELDS:\n" +
                "- name: Must be a descriptive and meaningful title. Avoid generic words like 'Purchase' or 'Food'. Include the business/service name and context (e.g., 'Dinner at Burger King', 'Monthly Salary from TechCorp', 'Groceries at Walmart').\n" +
                "- amount: Total absolute amount of the transaction. Always positive, no currency symbols.\n" +
                "- sourceNodeId (who pays / where the money comes from): Carefully analyze the historical context and past events. If not explicit, infer based on past similar transactions found in the historical data.\n" +
                "- destinationNodeId (who receives / where the money goes to): Carefully analyze the historical context. If ambiguous, look at where similar past events were routed to find the exact destination node ID.\n" +
                "- categoryId: Look at the historical context to infer the most appropriate category ID based on the event's name, nodes, and how similar events were categorized in the past. Null if unclear.\n" +
                "- transactionDate: The date in YYYY-MM-DD format. Extract from text if present, otherwise leave null.\n" +
                "- IMPORTANT: Return ONLY valid JSON as your response. Do not include any conversational text, explanations, greetings, or markdown formatting (like ```json).\n\n"
                +
                "EXAMPLE:\n" +
                "Context: Nodes: [id: 1, name: Wallet], [id: 2, name: Supermarket]. Categories: [id: 5, name: Food].\n"
                +
                "Text: Spent 50 in the supermarket from my wallet.\n" +
                "Output: { \"name\": \"Groceries at Supermarket\", \"amount\": 50.00, \"sourceNodeId\": 1, \"destinationNodeId\": 2, \"categoryId\": 5 }\n\n"
                +
                "Now process the user request.";

        // Call the Langchain4j structured output extraction
        FinanceEventExtractionDto extraction = financeExtractor.extractEvent(request.getText(), extractionPrompt);

        log.infof(
                "AI extracted event from text: '%s'. Result: name=%s, amount=%s, sourceNodeId=%s, destinationNodeId=%s, categoryId=%s, date=%s",
                request.getText(), extraction.getName(), extraction.getAmount(), extraction.getSourceNodeId(),
                extraction.getDestinationNodeId(), extraction.getCategoryId(), extraction.getTransactionDate());

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
                transactionDate = LocalDate.parse(extraction.getTransactionDate(), DateTimeFormatter.ISO_LOCAL_DATE)
                        .atStartOfDay();
            } catch (Exception e) {
                // If parsing fails, stick with current time
            }
        }
        transaction.transactionDate = transactionDate;

        List<FinanceLineItem> lineItems = new ArrayList<>();
        java.math.BigDecimal amount = extraction.getAmount();

        if (amount == null || amount.compareTo(java.math.BigDecimal.ZERO) <= 0
                || extraction.getSourceNodeId() == null || extraction.getDestinationNodeId() == null) {
            log.infof("AI extraction was incomplete for text: '%s'. Falling back to draft.", request.getText());
            return createDraftFallback(extraction);
        }

        // Nodo de origen (resta)
        FinanceLineItem sourceItem = new FinanceLineItem();
        sourceItem.amount = amount.negate();

        FinanceNode sourceNode = new FinanceNode();
        sourceNode.id = extraction.getSourceNodeId();
        sourceItem.financeNode = sourceNode;
        sourceItem.transaction = transaction;
        lineItems.add(sourceItem);

        // Nodo de destino (suma)
        FinanceLineItem destItem = new FinanceLineItem();
        destItem.amount = amount;
        FinanceNode destNode = new FinanceNode();
        destNode.id = extraction.getDestinationNodeId();
        destItem.financeNode = destNode;
        destItem.transaction = transaction;
        lineItems.add(destItem);

        transaction.lineItems = lineItems;
        event.transaction = transaction;

        // Delegate persistence and validation to the existing service
        try {
            FinanceEventDto eventDto = eventService.create(event);
            return IntelligentEventResponseDto.builder()
                    .type(IntelligentEventResponseDto.ResponseType.EVENT)
                    .event(eventDto)
                    .build();
        } catch (Exception e) {
            log.warnf("Intelligent event creation failed, falling back to draft. Error: %s", e.getMessage());
            return createDraftFallback(extraction);
        }
    }

    private IntelligentEventResponseDto createDraftFallback(FinanceEventExtractionDto extraction) {
        try {
            String payloadJson = objectMapper.writeValueAsString(extraction);

            FinanceEventDraftDto draftDto = draftService.create(FinanceEventDraftDto.builder()
                    .rawPayloadJson(payloadJson)
                    .build());

            return IntelligentEventResponseDto.builder()
                    .type(IntelligentEventResponseDto.ResponseType.DRAFT)
                    .draft(draftDto)
                    .build();
        } catch (Exception e) {
            log.error("Critical failure: Could not even create a draft for the intelligent event", e);
            throw new BusinessException("Could not create event or draft from the provided text.");
        }
    }
}
