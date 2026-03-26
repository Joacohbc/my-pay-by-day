package com.mypaybyday.ai;

import com.mypaybyday.entity.Category;
import com.mypaybyday.entity.FinanceNode;
import com.mypaybyday.entity.Tag;
import com.mypaybyday.entity.TimePeriod;
import com.mypaybyday.enums.EventType;
import com.mypaybyday.repository.CategoryRepository;
import com.mypaybyday.repository.FinanceNodeRepository;
import com.mypaybyday.repository.TagRepository;
import com.mypaybyday.repository.TimePeriodRepository;
import com.mypaybyday.dto.IntelligentEventResponseDto;
import com.mypaybyday.dto.RawTextEventRequestDto;
import com.mypaybyday.service.EventService;
import com.mypaybyday.service.IntelligentEventService;

import dev.langchain4j.agent.tool.Tool;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.math.BigDecimal;
import java.time.temporal.Temporal;
import java.util.List;
import java.util.stream.Collectors;
import com.mypaybyday.dto.FinanceEventDto;

import org.jboss.logging.Logger;

/**
 * AI Tools: exposes financial data to the LLM via @Tool-annotated methods.
 * The LLM decides when to invoke these tools based on the user's question,
 * always fetching fresh data directly from the database.
 */
@ApplicationScoped
public class FinanceAiTools {

    private static final Logger log = Logger.getLogger(FinanceAiTools.class);

    @Inject
    FinanceNodeRepository financeNodeRepository;

    @Inject
    CategoryRepository categoryRepository;

    @Inject
    TagRepository tagRepository;

    @Inject
    TimePeriodRepository timePeriodRepository;

    @Inject
    EventService eventService;

    @Inject
    IntelligentEventService intelligentEventService;

    @Tool("Returns all active (non-archived) finance nodes: accounts, wallets, credit cards, external entities, and contacts. " +
            "Each entry contains id, name, and type (OWN, EXTERNAL, or CONTACT). " +
            "Use this tool when the user asks about nodes, accounts, wallets, or when you need to map a node name to its ID.")
    @Transactional
    public String getFinanceNodes() {
        List<FinanceNode> nodes = financeNodeRepository.find("archived", false).list();
        if (nodes.isEmpty()) {
            return "No finance nodes found.";
        }
        return nodes.stream()
                .map(n -> String.format("[id=%d, name=%s, type=%s]", n.id, n.name, n.type))
                .collect(Collectors.joining(", ", "Finance nodes: ", ""));
    }

    @Tool("Returns all budget categories. Each entry contains id and name. " +
            "Use this tool when the user asks about categories or when you need to map a category name to its ID.")
    @Transactional
    public String getCategories() {
        List<Category> categories = categoryRepository.listAll();
        if (categories.isEmpty()) {
            return "No categories found.";
        }
        return categories.stream()
                .map(c -> String.format("[id=%d, name=%s]", c.id, c.name))
                .collect(Collectors.joining(", ", "Categories: ", ""));
    }

    @Tool("Returns all available tags. Each entry contains id and name. " +
            "Use this tool when the user asks about tags or when you need to resolve tag names to IDs.")
    @Transactional
    public String getTags() {
        List<Tag> tags = tagRepository.listAll();
        if (tags.isEmpty()) {
            return "No tags found.";
        }
        return tags.stream()
                .map(t -> String.format("[id=%d, name=%s]", t.id, t.name))
                .collect(Collectors.joining(", ", "Tags: ", ""));
    }

    @Tool("Returns the most recent finance events ordered by date descending. " +
            "Provide a 'limit' between 1 and 50 to control how many events to retrieve. " +
            "Each event includes id, name, type, category, transaction date, and line items with amounts and node names. " +
            "Use this tool when the user asks about recent transactions, spending, or income.")
    @Transactional
    public String getRecentEvents(int limit) {
        int safeLimit = Math.min(Math.max(limit, 1), 50);
        var response = eventService.listAll(0, safeLimit, null, null, null, null, null, null);

        if (response.content().isEmpty()) {
            return "No events found.";
        }
        return response.content().stream()
                .map(this::formatEventDto)
                .collect(Collectors.joining("\n", "Recent events:\n", ""));
    }

    @Tool("Returns finance events whose transaction date falls within the given date range (inclusive). " +
            "Dates must be provided in ISO-8601 format: 'YYYY-MM-DDTHH:mm:ss' (e.g. '2026-01-01T00:00:00'). " +
            "Each event includes id, name, type, category, transaction date, and line items with amounts and node names. " +
            "Use this tool when the user asks about spending or income during a specific period, month, or date range.")
    @Transactional
    public String getEventsByDateRange(String from, String to) {
        return searchEvents(null, from, to, null, null, null);
    }

    @Tool("Broad search for finance events with multiple filters. Returns a list of matching events. " +
            "Filters (all optional, use null if not needed): " +
            "- search: text to search in name, description or category name. " +
            "- startDate/endDate: ISO-8601 format 'YYYY-MM-DDTHH:mm:ss'. " +
            "- type: 'INBOUND', 'OUTBOUND', or 'OTHER'. " +
            "- categoryId: numeric ID of the category. " +
            "- tagId: numeric ID of the tag. " +
            "Use this for complex queries like 'spending on restaurants last month' or 'expenses tagged #vacation'.")
    @Transactional
    public String searchEvents(String search, String startDate, String endDate, String type, Long categoryId, Long tagId) {
        try {
            EventType eventType = null;
            if (type != null && !type.isBlank()) {
                eventType = EventType.valueOf(type.toUpperCase());
            }

            // Map ISO-8601 full string to LocalDate for the service if possible,
            // but the service takes String and parses it. Wait, checking EventService.java...
            // EventService.listAll takes (page, size, search, startDate, endDate, type, categoryId, tagId)
            // It expects startDate/endDate as "YYYY-MM-DD".
            
            String sDate = startDate != null && startDate.length() >= 10 ? startDate.substring(0, 10) : startDate;
            String eDate = endDate != null && endDate.length() >= 10 ? endDate.substring(0, 10) : endDate;

            var response = eventService.listAll(0, 50, search, sDate, eDate, eventType, categoryId, tagId);
            
            if (response.content().isEmpty()) {
                return "No events found matching the criteria.";
            }

            return response.content().stream()
                    .map(this::formatEventDto)
                    .collect(Collectors.joining("\n", "Search results:\n", ""));
        } catch (Exception e) {
            return "Error searching events: " + e.getMessage();
        }
    }

    @Tool("Returns all time periods (budget containers) with their start date, end date, name, budget limit, and savings goal percentage. " +
            "Use this tool when the user asks about budgets, spending limits, or savings goals for a period.")
    @Transactional
    public String getTimePeriods() {
        List<TimePeriod> periods = timePeriodRepository.listAll();
        
        if (periods.isEmpty()) {
            return "No time periods found.";
        }

        return periods.stream()
                .map(p -> String.format("[id=%d, name=%s, from=%s, to=%s, limit=%s, savingsGoal=%s%%]",
                        p.id, p.name,
                        formatDate(p.startDate),
                        formatDate(p.endDate),
                        formatAmount(p.budgetLimit),
                        formatAmount(p.savingsPercentageGoal)))
                .collect(Collectors.joining("\n", "Time periods:\n", ""));
    }

    @Tool("Creates a finance event from a text description. Use this tool when the user provides a text description " +
            "of a financial transaction (e.g., from a receipt, invoice, or verbal description). " +
            "The text should include details like vendor name, item, amount, and date. " +
            "The system will use AI to extract structured data and create an event. " +
            "If the extraction is incomplete (missing nodes, etc.), a draft will be created instead. " +
            "Returns a summary of the created event or draft. " +
            "Call this tool ONCE per individual transaction/line item found on a receipt.")
    public String createEventFromText(String description) {
        log.infof("createEventFromText called with: %s", description);
        try {
            RawTextEventRequestDto request = new RawTextEventRequestDto();
            request.setText(description);

            IntelligentEventResponseDto result = intelligentEventService.createFromText(request);

            if (result.getType() == IntelligentEventResponseDto.ResponseType.EVENT) {
                FinanceEventDto event = result.getEvent();
                return String.format("EVENT_CREATED: name='%s', amount=%s, type=%s, category=%s, id=%d",
                        event.name(),
                        event.amount() != null ? event.amount().toPlainString() : "unknown",
                        event.type(),
                        event.category() != null ? event.category().name() : "uncategorized",
                        event.id());
            } else {
                FinanceEventDto draft = result.getEvent();
                return String.format("DRAFT_CREATED: name='%s', amount=%s (incomplete data — saved as draft for user to complete)",
                        draft.name(),
                        draft.amount() != null ? draft.amount().toPlainString() : "unknown");
            }
        } catch (Exception e) {
            log.errorf(e, "Failed to create event from text: %s", description);
            return "ERROR: Could not create event from description: " + e.getMessage();
        }
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private String formatEventDto(FinanceEventDto dto) {
        String category = (dto.category() != null) ? dto.category().name() : "uncategorized";
        String movements = "";
        if (dto.lineItems() != null) {
            movements = dto.lineItems().stream()
                    .map(li -> String.format("%s: %s", li.financeNodeName(), formatAmount(li.amount())))
                    .collect(Collectors.joining(", "));
        }
        return String.format("  - Event[id=%d, name=%s, type=%s, category=%s, date=%s, movements=(%s)]",
                dto.id(), dto.name(), dto.type(), category, formatDate(dto.transactionDate()), movements);
    }

    private String formatAmount(BigDecimal amount) {
        return amount != null ? amount.toPlainString() : "none";
    }

    private String formatDate(Temporal date) {
        return date != null ? date.toString() : "unknown date";
    }
}
