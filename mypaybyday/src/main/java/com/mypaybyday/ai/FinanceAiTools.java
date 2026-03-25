package com.mypaybyday.ai;

import com.mypaybyday.entity.Category;
import com.mypaybyday.entity.FinanceEvent;
import com.mypaybyday.entity.FinanceLineItem;
import com.mypaybyday.entity.FinanceNode;
import com.mypaybyday.entity.Tag;
import com.mypaybyday.entity.TimePeriod;
import com.mypaybyday.repository.CategoryRepository;
import com.mypaybyday.repository.EventRepository;
import com.mypaybyday.repository.FinanceNodeRepository;
import com.mypaybyday.repository.TagRepository;
import com.mypaybyday.repository.TimePeriodRepository;

import dev.langchain4j.agent.tool.Tool;
import io.quarkus.panache.common.Page;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * AI Tools: exposes financial data to the LLM via @Tool-annotated methods.
 * The LLM decides when to invoke these tools based on the user's question,
 * always fetching fresh data directly from the database.
 */
@ApplicationScoped
public class FinanceAiTools {

    @Inject
    FinanceNodeRepository financeNodeRepository;

    @Inject
    CategoryRepository categoryRepository;

    @Inject
    TagRepository tagRepository;

    @Inject
    EventRepository eventRepository;

    @Inject
    TimePeriodRepository timePeriodRepository;

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
        List<FinanceEvent> events = eventRepository
                .find("ORDER BY transaction.transactionDate DESC")
                .page(Page.of(0, safeLimit))
                .list();

        if (events.isEmpty()) {
            return "No events found.";
        }
        return events.stream()
                .map(FinanceAiTools::formatEvent)
                .collect(Collectors.joining("\n", "Recent events:\n", ""));
    }

    @Tool("Returns finance events whose transaction date falls within the given date range (inclusive). " +
            "Dates must be provided in ISO-8601 format: 'YYYY-MM-DDTHH:mm:ss' (e.g. '2026-01-01T00:00:00'). " +
            "Each event includes id, name, type, category, transaction date, and line items with amounts and node names. " +
            "Use this tool when the user asks about spending or income during a specific period, month, or date range.")
    @Transactional
    public String getEventsByDateRange(String from, String to) {
        try {
            LocalDateTime fromDt = LocalDateTime.parse(from);
            LocalDateTime toDt = LocalDateTime.parse(to);

            List<FinanceEvent> events = eventRepository.list(
                    "transaction.transactionDate >= ?1 and transaction.transactionDate <= ?2 ORDER BY transaction.transactionDate DESC",
                    fromDt, toDt);
            
            if (events.isEmpty()) {
                return "No events found in the given date range.";
            }

            return events.stream()
                    .map(FinanceAiTools::formatEvent)
                    .collect(Collectors.joining("\n", "Events from " + from + " to " + to + ":\n", ""));
        } catch (Exception e) {
            return "Invalid date format. Please use ISO-8601 format: YYYY-MM-DDTHH:mm:ss";
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
                        p.id, p.name, p.startDate, p.endDate,
                        p.budgetLimit != null ? p.budgetLimit.toPlainString() : "none",
                        p.savingsPercentageGoal != null ? p.savingsPercentageGoal : "none"))
                .collect(Collectors.joining("\n", "Time periods:\n", ""));
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private static String formatEvent(FinanceEvent e) {
        String category = (e.category != null) ? e.category.name : "uncategorized";
        String date = (e.transaction != null && e.transaction.transactionDate != null)
                ? e.transaction.transactionDate.toString() : "unknown date";
        String lineItems = "";
        if (e.transaction != null && e.transaction.lineItems != null) {
            lineItems = e.transaction.lineItems.stream()
                    .map(FinanceAiTools::formatLineItem)
                    .collect(Collectors.joining(", "));
        }
        return String.format("  - Event[id=%d, name=%s, type=%s, category=%s, date=%s, movements=(%s)]",
                e.id, e.name, e.type, category, date, lineItems);
    }

    private static String formatLineItem(FinanceLineItem li) {
        String nodeName = (li.financeNode != null) ? li.financeNode.name : "unknown";
        String amount = (li.amount != null) ? li.amount.toPlainString() : "null";
        return String.format("%s: %s", nodeName, amount);
    }
}
