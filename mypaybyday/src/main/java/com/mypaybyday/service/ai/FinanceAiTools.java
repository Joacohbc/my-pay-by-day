package com.mypaybyday.service.ai;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.Temporal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.CategoryDto;
import com.mypaybyday.dto.EventQuery;
import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.IntelligentEventResponseDto;
import com.mypaybyday.dto.PatchEventDto;
import com.mypaybyday.dto.RawTextEventRequestDto;
import com.mypaybyday.dto.TagDto;
import com.mypaybyday.enums.EventType;
import com.mypaybyday.enums.FinanceNodeType;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.AggregationService;
import com.mypaybyday.service.CategoryService;
import com.mypaybyday.service.DraftService;
import com.mypaybyday.service.FinanceNodeService;
import com.mypaybyday.service.IntelligentEventService;
import com.mypaybyday.service.SubscriptionService;
import com.mypaybyday.service.TagGroupService;
import com.mypaybyday.service.TagService;
import com.mypaybyday.service.TemplateService;
import com.mypaybyday.service.TimePeriodService;
import com.mypaybyday.service.event.EventService;
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import io.quarkus.runtime.annotations.RegisterForReflection;
import org.jboss.logging.Logger;
import org.openapitools.jackson.nullable.JsonNullable;

@RegisterForReflection
@ApplicationScoped
public class FinanceAiTools {

    private static final Logger log = Logger.getLogger(FinanceAiTools.class);

    private final FinanceNodeService financeNodeService;
    private final CategoryService categoryService;
    private final TagService tagService;
    private final TagGroupService tagGroupService;
    private final TimePeriodService timePeriodService;
    private final SubscriptionService subscriptionService;
    private final TemplateService templateService;
    private final DraftService draftService;
    private final EventService eventService;
    private final IntelligentEventService intelligentEventService;
    private final AggregationService aggregationService;

    public FinanceAiTools(
            FinanceNodeService financeNodeService,
            CategoryService categoryService,
            TagService tagService,
            TagGroupService tagGroupService,
            TimePeriodService timePeriodService,
            SubscriptionService subscriptionService,
            TemplateService templateService,
            DraftService draftService,
            EventService eventService,
            IntelligentEventService intelligentEventService,
            AggregationService aggregationService) {
        this.financeNodeService = financeNodeService;
        this.categoryService = categoryService;
        this.tagService = tagService;
        this.tagGroupService = tagGroupService;
        this.timePeriodService = timePeriodService;
        this.subscriptionService = subscriptionService;
        this.templateService = templateService;
        this.draftService = draftService;
        this.eventService = eventService;
        this.intelligentEventService = intelligentEventService;
        this.aggregationService = aggregationService;
    }

    // =========================================================================
    // READ tools — domain queries
    // =========================================================================

    @Tool("Returns all finance nodes (accounts, wallets, cards, external entities, contacts). " +
            "Optional type filter: OWN, EXTERNAL, or CONTACT. Optional archived filter (true/false). " +
            "Each entry contains id, name, type, and archived status.")
    @AgentToolKind(AgentToolKind.Kind.READ)
    @Transactional
    public String getFinanceNodes(
            @P("Filter by node type: OWN, EXTERNAL, CONTACT. Pass null for all.") String type,
            @P("Filter archived nodes: true = archived only, false = active only, null = all.") Boolean archived) {
        FinanceNodeType nodeType = null;
        if (type != null && !type.isBlank()) {
            try {
                nodeType = FinanceNodeType.valueOf(type.toUpperCase());
            } catch (IllegalArgumentException e) {
                return "Invalid node type. Use: OWN, EXTERNAL, or CONTACT.";
            }
        }
        var nodes = financeNodeService.listAll(archived, nodeType);
        if (nodes.isEmpty()) return "No finance nodes found.";
        return nodes.stream()
                .map(n -> String.format("[id=%d, name=%s, type=%s, archived=%b%s]",
                        n.id(), n.name(), n.type(), n.archived(),
                        n.description() != null && !n.description().isBlank() ? ", description=" + n.description() : ""))
                .collect(Collectors.joining(", ", "Finance nodes: ", ""));
    }

    @Tool("Returns a single finance node by ID.")
    @AgentToolKind(AgentToolKind.Kind.READ)
    @Transactional
    public String getNodeById(@P("The finance node ID.") Long id) {
        try {
            var node = financeNodeService.findById(id);
            return String.format("[id=%d, name=%s, type=%s, archived=%b]",
                    node.id(), node.name(), node.type(), node.archived());
        } catch (BusinessException e) {
            return "Node not found: " + id;
        }
    }

    @Tool("Returns the current balance of a finance node (sum of all line-item amounts). " +
            "Optionally scoped to a time period by periodId.")
    @AgentToolKind(AgentToolKind.Kind.READ)
    @Transactional
    public String getNodeBalance(
            @P("Finance node ID.") Long nodeId,
            @P("Optional time period ID to scope the balance. Pass null for all-time.") Long periodId) {
        try {
            BigDecimal balance = aggregationService.nodeBalance(nodeId);
            return String.format("Node %d balance: %s", nodeId, balance.toPlainString());
        } catch (Exception e) {
            return "Error computing balance: " + e.getMessage();
        }
    }

    @Tool("Returns all budget categories. Each entry contains id and name.")
    @AgentToolKind(AgentToolKind.Kind.READ)
    @Transactional
    public String getCategories() {
        var categories = categoryService.listAll(null);
        if (categories.isEmpty()) return "No categories found.";
        return categories.stream()
                .map(c -> String.format("[id=%d, name=%s%s]", c.id(), c.name(),
                        c.description() != null && !c.description().isBlank() ? ", description=" + c.description() : ""))
                .collect(Collectors.joining(", ", "Categories: ", ""));
    }

    @Tool("Returns all available tags. Each entry contains id and name.")
    @AgentToolKind(AgentToolKind.Kind.READ)
    @Transactional
    public String getTags() {
        var tags = tagService.listAll(null);
        if (tags.isEmpty()) return "No tags found.";
        return tags.stream()
                .map(t -> String.format("[id=%d, name=%s%s]", t.id(), t.name(),
                        t.description() != null && !t.description().isBlank() ? ", description=" + t.description() : ""))
                .collect(Collectors.joining(", ", "Tags: ", ""));
    }

    @Tool("Returns all tag groups with their tags.")
    @AgentToolKind(AgentToolKind.Kind.READ)
    @Transactional
    public String getTagGroups() {
        var groups = tagGroupService.listAll(null);
        if (groups.isEmpty()) return "No tag groups found.";
        return groups.stream()
                .map(g -> String.format("[id=%d, name=%s]", g.id(), g.name()))
                .collect(Collectors.joining(", ", "Tag groups: ", ""));
    }

    @Tool("Returns the most recent finance events ordered by date descending. " +
            "Provide a limit between 1 and 50.")
    @AgentToolKind(AgentToolKind.Kind.READ)
    @Transactional
    public String getRecentEvents(@P("Number of events to return (1-50).") int limit) {
        int safeLimit = Math.min(Math.max(limit, 1), 50);
        var response = eventService.listAll(EventQuery.builder().page(0).size(safeLimit).build());
        if (response.content().isEmpty()) return "No events found.";
        return response.content().stream()
                .map(this::formatEventDto)
                .collect(Collectors.joining("\n", "Recent events:\n", ""));
    }

    @Tool("Returns a single finance event by ID.")
    @AgentToolKind(AgentToolKind.Kind.READ)
    @Transactional
    public String getEventById(@P("The event ID.") Long id) {
        try {
            return formatEventDto(eventService.findById(id));
        } catch (BusinessException e) {
            return "Event not found: " + id;
        }
    }

    @Tool("Returns finance events whose transaction date falls within a given date range (inclusive). " +
            "Dates must be ISO-8601 format: 'YYYY-MM-DDTHH:mm:ss'.")
    @AgentToolKind(AgentToolKind.Kind.READ)
    @Transactional
    public String getEventsByDateRange(
            @P("Start date in 'YYYY-MM-DDTHH:mm:ss' format.") String from,
            @P("End date in 'YYYY-MM-DDTHH:mm:ss' format.") String to) {
        return searchEvents(null, from, to, null, null, null);
    }

    @Tool("Broad search for finance events with optional filters. " +
            "Filters: search (text in name/description/category), startDate/endDate (ISO-8601 'YYYY-MM-DDTHH:mm:ss'), " +
            "type ('INBOUND', 'OUTBOUND', 'OTHER'), categoryId, tagId. All filters are optional.")
    @AgentToolKind(AgentToolKind.Kind.READ)
    @Transactional
    public String searchEvents(
            @P("Text to search in name, description, or category name. Null to skip.") String search,
            @P("Start date ISO-8601. Null to skip.") String startDate,
            @P("End date ISO-8601. Null to skip.") String endDate,
            @P("Event type: INBOUND, OUTBOUND, or OTHER. Null to skip.") String type,
            @P("Category ID filter. Null to skip.") Long categoryId,
            @P("Tag ID filter. Null to skip.") Long tagId) {
        try {
            EventType eventType = null;
            if (type != null && !type.isBlank()) {
                eventType = EventType.valueOf(type.toUpperCase());
            }
            String sDate = startDate != null && startDate.length() >= 10 ? startDate.substring(0, 10) : startDate;
            String eDate = endDate != null && endDate.length() >= 10 ? endDate.substring(0, 10) : endDate;

            var response = eventService.listAll(EventQuery.builder()
                    .page(0).size(50)
                    .search(search).startDate(sDate).endDate(eDate)
                    .type(eventType).categoryId(categoryId).tagId(tagId)
                    .build());

            if (response.content().isEmpty()) return "No events found matching the criteria.";
            return response.content().stream()
                    .map(this::formatEventDto)
                    .collect(Collectors.joining("\n", "Search results:\n", ""));
        } catch (Exception e) {
            return "Error searching events: " + e.getMessage();
        }
    }

    @Tool("Returns all time periods (budget containers) with start date, end date, budget limit, and savings goal.")
    @AgentToolKind(AgentToolKind.Kind.READ)
    @Transactional
    public String getTimePeriods() {
        var response = timePeriodService.listAll(0, 100);
        if (response.content().isEmpty()) return "No time periods found.";
        return response.content().stream()
                .map(p -> String.format("[id=%d, name=%s, from=%s, to=%s, limit=%s, savingsGoal=%s%%]",
                        p.id(), p.name(), p.startDate(), p.endDate(),
                        formatAmount(p.budgetLimit()), formatAmount(p.savingsPercentageGoal())))
                .collect(Collectors.joining("\n", "Time periods:\n", ""));
    }

    @Tool("Returns the active time period (the one whose date range includes today).")
    @AgentToolKind(AgentToolKind.Kind.READ)
    @Transactional
    public String getActiveTimePeriod() {
        LocalDate today = LocalDate.now();
        var response = timePeriodService.listAll(0, 100);
        return response.content().stream()
                .filter(p -> p.startDate() != null && p.endDate() != null
                        && !today.isBefore(p.startDate()) && !today.isAfter(p.endDate()))
                .findFirst()
                .map(p -> String.format("[id=%d, name=%s, from=%s, to=%s, limit=%s]",
                        p.id(), p.name(), p.startDate(), p.endDate(), formatAmount(p.budgetLimit())))
                .orElse("No active time period found for today (" + today + ").");
    }

    @Tool("Returns the balance (income, outbound, category budgets) for a given time period.")
    @AgentToolKind(AgentToolKind.Kind.READ)
    @Transactional
    public String getTimePeriodBalance(@P("Time period ID.") Long periodId) {
        try {
            var balance = timePeriodService.getBalance(periodId);
            return String.format("Period '%s': income=%s, outbound=%s, net=%s",
                    balance.timePeriod().name(),
                    formatAmount(balance.income()),
                    formatAmount(balance.outbound()),
                    formatAmount(balance.income().subtract(balance.outbound())));
        } catch (BusinessException e) {
            return "Time period not found: " + periodId;
        }
    }

    @Tool("Returns the spending amount for a category in a given time period.")
    @AgentToolKind(AgentToolKind.Kind.READ)
    @Transactional
    public String getCategorySpendingByPeriod(
            @P("Category ID.") Long categoryId,
            @P("Time period ID.") Long periodId) {
        try {
            BigDecimal spending = aggregationService.categorySpendingInPeriod(categoryId, periodId);
            return String.format("Category %d spending in period %d: %s", categoryId, periodId, spending.toPlainString());
        } catch (BusinessException e) {
            return "Error: " + e.getMessage();
        }
    }

    @Tool("Returns monthly aggregated spending by category for a given year and month.")
    @AgentToolKind(AgentToolKind.Kind.READ)
    @Transactional
    public String getMonthlyAggregates(
            @P("Year (e.g. 2026).") int year,
            @P("Month (1-12).") int month) {
        try {
            Map<Long, BigDecimal> byCategory = aggregationService.monthlyByCategory(year, month);
            if (byCategory.isEmpty()) return "No events found for " + year + "-" + month + ".";
            var categories = categoryService.listAll(null);
            Map<Long, String> catNames = categories.stream()
                    .collect(Collectors.toMap(c -> c.id(), c -> c.name()));
            return byCategory.entrySet().stream()
                    .map(e -> catNames.getOrDefault(e.getKey(), "id=" + e.getKey()) + ": " + e.getValue().toPlainString())
                    .collect(Collectors.joining(", ", "Monthly aggregates " + year + "-" + month + ": ", ""));
        } catch (Exception e) {
            return "Error computing aggregates: " + e.getMessage();
        }
    }

    @Tool("Returns all subscriptions. Pass active=true to see only active ones, active=false for cancelled.")
    @AgentToolKind(AgentToolKind.Kind.READ)
    @Transactional
    public String getSubscriptions(@P("Filter by active status. Null for all.") Boolean active) {
        var response = subscriptionService.listAll(0, 100);
        var subs = response.content();
        if (active != null) {
            subs = subs.stream()
                    .filter(s -> active ? "ACTIVE".equals(String.valueOf(s.status())) : !"ACTIVE".equals(String.valueOf(s.status())))
                    .collect(Collectors.toList());
        }
        if (subs.isEmpty()) return "No subscriptions found.";
        return subs.stream()
                .map(s -> String.format("[id=%d, name=%s, recurrence=%s, status=%s, next=%s]",
                        s.id(), s.name(), s.recurrence(), s.status(), s.nextExecutionDate()))
                .collect(Collectors.joining(", ", "Subscriptions: ", ""));
    }

    @Tool("Returns all event templates, optionally filtered by a search term.")
    @AgentToolKind(AgentToolKind.Kind.READ)
    @Transactional
    public String getTemplates(@P("Optional search term. Pass null for all.") String search) {
        var response = templateService.listAll(0, 100);
        var templates = response.content();
        if (search != null && !search.isBlank()) {
            String lower = search.toLowerCase();
            templates = templates.stream()
                    .filter(t -> t.name().toLowerCase().contains(lower))
                    .collect(Collectors.toList());
        }
        if (templates.isEmpty()) return "No templates found.";
        return templates.stream()
                .map(t -> String.format("[id=%d, name=%s]", t.id(), t.name()))
                .collect(Collectors.joining(", ", "Templates: ", ""));
    }

    @Tool("Returns all draft (incomplete) finance events pending user completion.")
    @AgentToolKind(AgentToolKind.Kind.READ)
    @Transactional
    public String getDrafts() {
        var drafts = draftService.listFinanceEventDrafts();
        if (drafts.isEmpty()) return "No drafts found.";
        return drafts.stream()
                .map(e -> String.format("[id=%d, name=%s, amount=%s]",
                        e.id(), e.name(), formatAmount(e.amount())))
                .collect(Collectors.joining(", ", "Drafts: ", ""));
    }

    // =========================================================================
    // WRITE tools — domain mutations
    // =========================================================================

    @Tool("Extracts and persists a single financial transaction as a DRAFT in the system. " +
            "It uses advanced AI to parse natural language text into structured accounting entities (Events, Transactions, and LineItems). " +
            "CRITICAL: You MUST gather ALL required details from the user (Amount, Date/Time, Source Node/Account, Destination Node, Category, and Tags) before calling this tool. " +
            "Never create a draft with 'null' or missing core data if it can be requested from the user first. " +
            "This tool processes exactly ONE transaction. If the user describes multiple movements, call this tool sequentially for each one. " +
            "Returns a structured summary of the created DRAFT or an error message.")
    @AgentToolKind(AgentToolKind.Kind.WRITE)
    public String createDraftFromText(
            @P("The detailed natural language text describing the transaction. Include amount, currency, actors, and temporal context.") String description,
            @P("Optional directives to force specific IDs or logic. Use this to pass confirmed Node IDs, Category IDs, or Tag IDs. Format: 'Use sourceNodeId=X, categoryId=Y'. Pass null if no specific overrides are needed.") String instructions) {
        try {
            RawTextEventRequestDto request = new RawTextEventRequestDto();
            request.setText(description);
            request.setInstructions(instructions);
            IntelligentEventResponseDto result = intelligentEventService.createFromText(request);
            FinanceEventDto event = result.getEvent();
            if (result.getType() == IntelligentEventResponseDto.ResponseType.EVENT) {
                return String.format("EVENT_CREATED: name='%s', amount=%s, type=%s, category=%s, id=%d",
                        event.name(), formatAmount(event.amount()), event.type(),
                        event.category() != null ? event.category().name() : "uncategorized", event.id());
            }
            return String.format("DRAFT_CREATED: name='%s', amount=%s (incomplete — saved as draft)",
                    event.name(), formatAmount(event.amount()));
        } catch (Exception e) {
            log.errorf(e, "Failed to create event from text: %s", description);
            return "ERROR: " + e.getMessage();
        }
    }

    @Tool("Updates the category of an existing finance event.")
    @AgentToolKind(AgentToolKind.Kind.WRITE)
    @Transactional
    public String updateEventCategory(
            @P("Event ID to update.") Long eventId,
            @P("New category ID.") Long categoryId) {
        try {
            CategoryDto cat = categoryService.findById(categoryId);
            PatchEventDto patch = new PatchEventDto();
            patch.setCategory(JsonNullable.of(cat));
            FinanceEventDto updated = eventService.update(eventId, patch);
            return String.format("EVENT_UPDATED: id=%d, category=%s", updated.id(),
                    updated.category() != null ? updated.category().name() : "none");
        } catch (BusinessException e) {
            return "ERROR: " + e.getMessage();
        }
    }

    @Tool("Adds tags to an existing finance event. Merges with existing tags.")
    @AgentToolKind(AgentToolKind.Kind.WRITE)
    @Transactional
    public String addTagsToEvent(
            @P("Event ID.") Long eventId,
            @P("Comma-separated tag IDs to add (e.g. '1,2,3').") String tagIdsCsv) {
        try {
            FinanceEventDto existing = eventService.findById(eventId);
            List<TagDto> currentTags = existing.tags() != null
                    ? new java.util.ArrayList<>(existing.tags())
                    : new java.util.ArrayList<>();
            for (String part : tagIdsCsv.split(",")) {
                long tagId = Long.parseLong(part.trim());
                TagDto tag = tagService.findById(tagId);
                if (currentTags.stream().noneMatch(t -> t.id().equals(tagId))) {
                    currentTags.add(tag);
                }
            }
            PatchEventDto patch = new PatchEventDto();
            patch.setTags(JsonNullable.of(currentTags));
            FinanceEventDto updated = eventService.update(eventId, patch);
            return String.format("TAGS_UPDATED: event=%d, tags=%s", updated.id(),
                    updated.tags() != null
                            ? updated.tags().stream().map(TagDto::name).collect(Collectors.joining(", "))
                            : "none");
        } catch (BusinessException e) {
            return "ERROR: " + e.getMessage();
        }
    }

    @Tool("Archives a finance node (account, wallet, external entity, or contact). " +
            "Archived nodes are hidden from the UI but preserved for historical calculations.")
    @AgentToolKind(AgentToolKind.Kind.WRITE)
    @Transactional
    public String archiveNode(@P("Finance node ID to archive.") Long nodeId) {
        try {
            financeNodeService.archive(nodeId);
            return "NODE_ARCHIVED: id=" + nodeId;
        } catch (BusinessException e) {
            return "ERROR: " + e.getMessage();
        }
    }

    @Tool("Triggers immediate execution of a subscription, generating a new finance event from the subscription template.")
    @AgentToolKind(AgentToolKind.Kind.WRITE)
    @Transactional
    public String triggerSubscription(@P("Subscription ID to trigger.") Long subscriptionId) {
        try {
            subscriptionService.processSubscription(subscriptionId);
            return "SUBSCRIPTION_TRIGGERED: id=" + subscriptionId;
        } catch (BusinessException e) {
            return "ERROR: " + e.getMessage();
        }
    }

    @Tool("Cancels a subscription, stopping future automatic event generation.")
    @AgentToolKind(AgentToolKind.Kind.WRITE)
    @Transactional
    public String cancelSubscription(@P("Subscription ID to cancel.") Long subscriptionId) {
        try {
            var sub = subscriptionService.findById(subscriptionId);
            var updated = new com.mypaybyday.dto.SubscriptionDto(
                    sub.id(), sub.name(), sub.description(),
                    sub.originNodeId(), sub.originNodeName(),
                    sub.destinationNodeId(), sub.destinationNodeName(),
                    sub.category(), sub.tags(), sub.eventType(),
                    sub.modifierValue(), sub.recurrence(),
                    sub.nextExecutionDate(),
                    com.mypaybyday.enums.SubscriptionStatus.CANCELLED);
            subscriptionService.update(subscriptionId, updated);
            return "SUBSCRIPTION_CANCELLED: id=" + subscriptionId;
        } catch (BusinessException e) {
            return "ERROR: " + e.getMessage();
        }
    }

    // =========================================================================
    // Private helpers
    // =========================================================================

    private String formatEventDto(FinanceEventDto dto) {
        String category = dto.category() != null ? dto.category().name() : "uncategorized";
        String movements = "";
        if (dto.lineItems() != null) {
            movements = dto.lineItems().stream()
                    .map(li -> li.financeNodeName() + ": " + formatAmount(li.amount()))
                    .collect(Collectors.joining(", "));
        }
        return String.format("  - Event[id=%d, name=%s, type=%s, category=%s, date=%s, amount=%s, movements=(%s)]",
                dto.id(), dto.name(), dto.type(), category,
                formatDate(dto.transactionDate()), formatAmount(dto.amount()), movements);
    }

    private String formatAmount(BigDecimal amount) {
        return amount != null ? amount.toPlainString() : "none";
    }

    private String formatDate(Temporal date) {
        return date != null ? date.toString() : "unknown date";
    }
}
