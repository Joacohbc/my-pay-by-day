package com.mypaybyday.resource;

import com.mypaybyday.ai.FinanceExtractor;
import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.FinanceEventExtractionDto;
import com.mypaybyday.dto.RawTextEventRequestDto;
import com.mypaybyday.entity.Category;
import com.mypaybyday.entity.FinanceEvent;
import com.mypaybyday.entity.FinanceLineItem;
import com.mypaybyday.entity.FinanceNode;
import com.mypaybyday.entity.FinanceTransaction;
import com.mypaybyday.entity.Tag;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.EventService;
import com.mypaybyday.i18n.LanguageContext;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;

import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

@Path("/events/intelligent")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@org.eclipse.microprofile.openapi.annotations.tags.Tag(name = "Intelligent Events", description = "AI-powered endpoints for creating events.")
public class IntelligentEventResource {

    @Inject
    FinanceExtractor financeExtractor;

    @Inject
    EventService eventService;

    @Inject
    LanguageContext languageContext;

    @Inject
    Messages messages;

    @POST
    @Operation(summary = "Create an event from raw text", description = "Uses the AI model and RAG to interpret raw text and automatically create the corresponding FinanceEvent.")
    @APIResponse(responseCode = "201", description = "Event successfully created", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = FinanceEventDto.class)))
    @APIResponse(responseCode = "400", description = "Invalid text or generated event validation failed")
    public Response createFromText(@Valid RawTextEventRequestDto request) throws BusinessException {

        // Construct the AI context
        String systemPrompt = messages.get(MsgKey.AI_SYSTEM_PROMPT, LocalDateTime.now().toString(), languageContext.getLang());
        String extractionPrompt = systemPrompt + "\n\n" +
            "TASK:\n" +
            "Extract a structured finance event from the provided raw text using ONLY the categories, tags, and nodes available in the RAG context.\n" +
            "- If the text mentions an entity that perfectly matches one in the context, use its ID.\n" +
            "- Always ensure the line items adhere to the zero-sum rule (their amounts must sum to 0).\n" +
            "- Provide sensible defaults for missing information where possible, based on your knowledge base.";

        // Call the Langchain4j structured output extraction
        FinanceEventExtractionDto extraction = financeExtractor.extractEvent(request.getText(), extractionPrompt);

        // Map the extracted DTO to the entities
        FinanceEvent event = new FinanceEvent();
        event.name = extraction.getName();
        event.description = extraction.getDescription() != null ? extraction.getDescription() : "Created intelligently from: " + request.getText();
        event.type = extraction.getType() != null ? extraction.getType() : com.mypaybyday.enums.EventType.OUTBOUND;

        // Map Category
        if (extraction.getCategoryId() != null) {
            Category category = new Category();
            category.id = extraction.getCategoryId();
            event.category = category;
        }

        // Map Tags
        if (extraction.getTagIds() != null && !extraction.getTagIds().isEmpty()) {
            List<Tag> tags = new ArrayList<>();
            for (Long tagId : extraction.getTagIds()) {
                Tag tag = new Tag();
                tag.id = tagId;
                tags.add(tag);
            }
            event.tags = tags;
        }

        // Map Transaction and Line Items
        FinanceTransaction transaction = new FinanceTransaction();

        // Parse the extracted date
        LocalDateTime transactionDate = LocalDateTime.now();
        if (extraction.getTransactionDate() != null) {
            try {
                // Assuming format YYYY-MM-DD from AI extraction prompt, default to start of day
                transactionDate = LocalDate.parse(extraction.getTransactionDate(), DateTimeFormatter.ISO_LOCAL_DATE).atStartOfDay();
            } catch (Exception e) {
                // If parsing fails, stick with current time
            }
        }
        transaction.transactionDate = transactionDate;

        List<FinanceLineItem> lineItems = new ArrayList<>();
        if (extraction.getLineItems() != null) {
            for (FinanceEventExtractionDto.LineItemExtractionDto liExtraction : extraction.getLineItems()) {
                if (liExtraction.getNodeId() != null && liExtraction.getAmount() != null) {
                    FinanceLineItem item = new FinanceLineItem();
                    item.amount = liExtraction.getAmount();
                    FinanceNode node = new FinanceNode();
                    node.id = liExtraction.getNodeId();
                    item.financeNode = node;
                    item.transaction = transaction;
                    lineItems.add(item);
                }
            }
        }

        if (lineItems.isEmpty()) {
            throw new BusinessException("AI could not extract sufficient transaction line items from the provided text.");
        }

        transaction.lineItems = lineItems;
        event.transaction = transaction;

        // Delegate persistence and validation to the existing service
        FinanceEventDto createdEvent = eventService.create(event);

        return Response.status(Response.Status.CREATED).entity(createdEvent).build();
    }
}
