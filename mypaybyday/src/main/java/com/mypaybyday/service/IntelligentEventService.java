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
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.LanguageContext;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@ApplicationScoped
public class IntelligentEventService {

    @Inject
    FinanceExtractor financeExtractor;

    @Inject
    EventService eventService;

    @Inject
    LanguageContext languageContext;

    @Inject
    Messages messages;

    public FinanceEventDto createFromText(RawTextEventRequestDto request) throws BusinessException {
        // Construct the AI context
        String systemPrompt = messages.get(MsgKey.AI_SYSTEM_PROMPT, LocalDateTime.now().toString(),
                languageContext.getLang());
        String extractionPrompt = systemPrompt + "\n\n" +
                "TASK:\n" +
                "Extract the transaction details using ONLY the IDs provided in the context.\n" +
                "RULES:\n" +
                "- Extract the absolute positive amount.\n" +
                "- Identify the sourceNodeId (who pays) and destinationNodeId (who receives).\n\n" +
                "EXAMPLE:\n" +
                "Context: Nodes: [id: 1, name: Wallet], [id: 2, name: Supermarket]. Categories: [id: 5, name: Food].\n" +
                "Text: Spent 50 in the supermarket from my wallet.\n" +
                "Output: { \"name\": \"Supermarket\", \"amount\": 50.00, \"sourceNodeId\": 1, \"destinationNodeId\": 2, \"categoryId\": 5 }\n\n" +
                "Now process the user request.";

        // Call the Langchain4j structured output extraction
        FinanceEventExtractionDto extraction = financeExtractor.extractEvent(request.getText(), extractionPrompt);

        // Map the extracted DTO to the entities
        FinanceEvent event = new FinanceEvent();
        event.name = extraction.getName();
        event.description = "Created intelligently from: " + request.getText();
        event.type = com.mypaybyday.enums.EventType.OUTBOUND;

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

        if (amount != null && amount.compareTo(java.math.BigDecimal.ZERO) > 0) {
            // Nodo de origen (resta)
            if (extraction.getSourceNodeId() != null) {
                FinanceLineItem sourceItem = new FinanceLineItem();
                sourceItem.amount = amount.negate(); // Java hace la matemática
                FinanceNode sourceNode = new FinanceNode();
                sourceNode.id = extraction.getSourceNodeId();
                sourceItem.financeNode = sourceNode;
                sourceItem.transaction = transaction;
                lineItems.add(sourceItem);
            }

            // Nodo de destino (suma)
            if (extraction.getDestinationNodeId() != null) {
                FinanceLineItem destItem = new FinanceLineItem();
                destItem.amount = amount; // Positivo
                FinanceNode destNode = new FinanceNode();
                destNode.id = extraction.getDestinationNodeId();
                destItem.financeNode = destNode;
                destItem.transaction = transaction;
                lineItems.add(destItem);
            }
        }

        if (lineItems.isEmpty()) {
            throw new BusinessException(
                    "AI could not extract sufficient transaction line items from the provided text.");
        }

        transaction.lineItems = lineItems;
        event.transaction = transaction;

        // Delegate persistence and validation to the existing service
        return eventService.create(event);
    }
}
