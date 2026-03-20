package com.mypaybyday.service;

import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.FinanceEventExtractionDto;
import com.mypaybyday.dto.RawTextEventRequestDto;
import com.mypaybyday.entity.Category;
import com.mypaybyday.entity.FinanceEvent;
import com.mypaybyday.entity.FinanceLineItem;
import com.mypaybyday.entity.FinanceNode;
import com.mypaybyday.entity.FinanceTransaction;
import com.mypaybyday.enums.EventType;
import com.mypaybyday.enums.FinanceNodeType;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.CategoryRepository;
import com.mypaybyday.repository.EventRepository;
import com.mypaybyday.repository.FinanceNodeRepository;

import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.response.ChatResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.jboss.logging.Logger;

/**
 * Intelligent event creation service that uses a 2-phase LLM extraction approach
 * optimized for small models (≤4B parameters).
 *
 * <p><b>Phase 1 — Basic Extraction:</b> A single LLM call extracts name, amount,
 * and date from raw text using a pipe-delimited format.
 *
 * <p><b>Phase 2 — Contextual Resolution:</b> Using the extracted name, the service
 * queries the database for similar historical events. A second LLM call receives
 * the available nodes, categories, and historical examples to resolve IDs.
 *
 * <p>If the LLM fails at any point, fallback logic uses the most frequent
 * node/category from similar historical events.
 */
@ApplicationScoped
public class IntelligentEventService {

    private static final Logger LOG = Logger.getLogger(IntelligentEventService.class);

    /** Maximum number of recent events to load for similarity search. */
    private static final int HISTORY_POOL_SIZE = 100;

    /** Maximum number of similar events to include in the resolution prompt. */
    private static final int HISTORY_CONTEXT_SIZE = 5;

    @Inject
    CategoryRepository categoryRepository;

    @Inject
    FinanceNodeRepository financeNodeRepository;

    @Inject
    EventRepository eventRepository;

    @Inject
    EventService eventService;

    @Inject
    ChatModel chatModel;

    @Inject
    Messages messages;

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /**
     * Creates a FinanceEvent from free-form text using a 2-phase LLM extraction.
     *
     * @param request the raw text request
     * @return the persisted FinanceEvent DTO
     * @throws BusinessException if the extraction produces insufficient data
     */
    public FinanceEventDto createFromText(RawTextEventRequestDto request) throws BusinessException {
        String inputText = request.getText().trim();

        // Phase 1: Extract basic fields (name, amount, date)
        FinanceEventExtractionDto extraction = extractBasicFields(inputText);

        // Phase 2: Resolve nodes and category using historical context
        resolveNodesAndCategory(inputText, extraction);

        // Apply fallbacks: ensure we always have usable values
        applyFallbacksFromHistory(extraction);

        // Build and persist the event
        return buildAndPersistEvent(inputText, extraction);
    }

    // -------------------------------------------------------------------------
    // Phase 1: Basic Extraction
    // -------------------------------------------------------------------------

    /**
     * Extracts name, amount, and date from raw text in a single LLM call.
     * Uses pipe-delimited format (NAME|AMOUNT|DATE) which small models
     * handle much more reliably than JSON.
     */
    private FinanceEventExtractionDto extractBasicFields(String inputText) {
        // Build few-shot examples with dynamic dates
        String yesterday = LocalDate.now().minusDays(1).format(DateTimeFormatter.ISO_LOCAL_DATE);
        String currentYear = String.valueOf(LocalDate.now().getYear());
        String exampleDate = currentYear + "-03-15";

        String prompt = messages.get(MsgKey.AI_EXTRACTION_BASIC_PROMPT, yesterday, exampleDate, inputText);

        String response = callLlm(prompt);

        return parseBasicExtraction(response, inputText);
    }

    /**
     * Parses the pipe-delimited response from Phase 1.
     * Expected format: NAME|AMOUNT|DATE
     * Applies defensive parsing with fallbacks.
     */
    private FinanceEventExtractionDto parseBasicExtraction(String response, String inputText) {
        FinanceEventExtractionDto dto = new FinanceEventExtractionDto();

        // Default: use the input text as name
        dto.setName(inputText.length() > 50 ? inputText.substring(0, 50) : inputText);

        if (response == null || response.isBlank()) {
            return dto;
        }

        // Clean up the response: take only the last line that contains pipes
        String cleanResponse = extractPipedLine(response);
        if (cleanResponse == null) {
            // If no piped line found, try to use the whole response as name
            dto.setName(response.trim().length() > 50 ? response.trim().substring(0, 50) : response.trim());
            return dto;
        }

        String[] parts = cleanResponse.split("\\|", -1);

        // Parse name
        if (parts.length > 0 && !parts[0].isBlank()) {
            String name = parts[0].trim();
            // Remove surrounding quotes if present
            name = name.replaceAll("^\"|\"$", "").replaceAll("^'|'$", "");
            if (!name.isBlank()) {
                dto.setName(name);
            }
        }

        // Parse amount
        if (parts.length > 1 && !isNone(parts[1])) {
            try {
                String amountStr = parts[1].trim()
                        .replaceAll("[^\\d.,]", "") // Remove currency symbols
                        .replace(",", "."); // Normalize decimals
                dto.setAmount(new BigDecimal(amountStr).abs());
            } catch (NumberFormatException e) {
                LOG.debugv("Could not parse amount from: {0}", parts[1]);
            }
        }

        // Parse date
        if (parts.length > 2 && !isNone(parts[2])) {
            try {
                String dateStr = parts[2].trim();
                LocalDate.parse(dateStr, DateTimeFormatter.ISO_LOCAL_DATE);
                dto.setTransactionDate(dateStr);
            } catch (Exception e) {
                LOG.debugv("Could not parse date from: {0}", parts[2]);
            }
        }

        return dto;
    }

    // -------------------------------------------------------------------------
    // Phase 2: Contextual Resolution
    // -------------------------------------------------------------------------

    /**
     * Resolves source/destination nodes, category, and event type using a second
     * LLM call enriched with historical context from similar past events.
     */
    private void resolveNodesAndCategory(String inputText, FinanceEventExtractionDto extraction) {
        // Load available metadata
        List<FinanceNode> allNodes = financeNodeRepository.findAll().list();
        List<Category> allCategories = categoryRepository.findAll().list();

        String nodesStr = allNodes.stream()
                .filter(n -> !n.archived)
                .map(n -> String.format("%d=%s (%s)", n.id, n.name, n.type))
                .collect(Collectors.joining("\n"));

        String categoriesStr = allCategories.stream()
                .map(c -> String.format("%d=%s%s", c.id, c.name,
                        c.description != null ? " (" + c.description + ")" : ""))
                .collect(Collectors.joining("\n"));

        // Find similar historical events
        List<FinanceEvent> similarEvents = findSimilarEvents(extraction.getName());

        String historyStr = similarEvents.isEmpty()
                ? "No similar events found."
                : similarEvents.stream()
                        .map(this::formatEventForContext)
                        .collect(Collectors.joining("\n"));

        // Build the resolution prompt
        String amountStr = extraction.getAmount() != null ? extraction.getAmount().toPlainString() : "unknown";

        String prompt = messages.get(MsgKey.AI_EXTRACTION_RESOLVE_PROMPT,
                extraction.getName(), amountStr, nodesStr, categoriesStr, historyStr);

        String response = callLlm(prompt);

        parseResolutionResponse(response, extraction, allNodes, allCategories);
    }

    /**
     * Parses the pipe-delimited response from Phase 2.
     * Expected format: SOURCE_ID|DEST_ID|CATEGORY_ID|TYPE
     * Validates that parsed IDs actually exist in the available lists.
     */
    private void parseResolutionResponse(String response, FinanceEventExtractionDto extraction,
            List<FinanceNode> allNodes, List<Category> allCategories) {
        if (response == null || response.isBlank()) {
            return;
        }

        String cleanResponse = extractPipedLine(response);
        if (cleanResponse == null) {
            return;
        }

        String[] parts = cleanResponse.split("\\|", -1);

        // Collect valid IDs for validation
        Set<Long> validNodeIds = allNodes.stream()
                .filter(n -> !n.archived)
                .map(n -> n.id)
                .collect(Collectors.toSet());
        Set<Long> validCategoryIds = allCategories.stream()
                .map(c -> c.id)
                .collect(Collectors.toSet());

        // Parse source node ID
        if (parts.length > 0 && !isNone(parts[0])) {
            Long id = parseLongSafe(parts[0]);
            if (id != null && validNodeIds.contains(id)) {
                extraction.setSourceNodeId(id);
            }
        }

        // Parse destination node ID
        if (parts.length > 1 && !isNone(parts[1])) {
            Long id = parseLongSafe(parts[1]);
            if (id != null && validNodeIds.contains(id)) {
                extraction.setDestinationNodeId(id);
            }
        }

        // Parse category ID
        if (parts.length > 2 && !isNone(parts[2])) {
            Long id = parseLongSafe(parts[2]);
            if (id != null && validCategoryIds.contains(id)) {
                extraction.setCategoryId(id);
            }
        }

        // Parse event type
        if (parts.length > 3 && !isNone(parts[3])) {
            try {
                extraction.setEventType(EventType.valueOf(parts[3].trim().toUpperCase()));
            } catch (IllegalArgumentException e) {
                LOG.debugv("Could not parse event type from: {0}", parts[3]);
            }
        }
    }

    // -------------------------------------------------------------------------
    // Historical Context
    // -------------------------------------------------------------------------

    /**
     * Finds similar past events by matching keywords from the extracted name
     * against event names in memory (names are encrypted, so JPQL search is impossible).
     */
    private List<FinanceEvent> findSimilarEvents(String extractedName) {
        if (extractedName == null || extractedName.isBlank()) {
            return List.of();
        }

        try {
            List<FinanceEvent> recentEvents = eventRepository.findRecentWithDetails(HISTORY_POOL_SIZE);

            // Tokenize the extracted name into keywords (>= 3 chars)
            Set<String> keywords = Arrays.stream(extractedName.toLowerCase().split("\\s+"))
                    .filter(w -> w.length() >= 3)
                    .collect(Collectors.toSet());

            if (keywords.isEmpty()) {
                // If no meaningful keywords, use the whole name
                keywords = Set.of(extractedName.toLowerCase());
            }

            final Set<String> searchKeywords = keywords;

            return recentEvents.stream()
                    .filter(e -> e.name != null && matchesAnyKeyword(e.name.toLowerCase(), searchKeywords))
                    .limit(HISTORY_CONTEXT_SIZE)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            LOG.warnv("Failed to load similar events: {0}", e.getMessage());
            return List.of();
        }
    }

    /**
     * Checks if the event name contains any of the search keywords.
     */
    private boolean matchesAnyKeyword(String eventName, Set<String> keywords) {
        return keywords.stream().anyMatch(eventName::contains);
    }

    /**
     * Formats a historical event into a compact one-line context string
     * suitable for inclusion in an LLM prompt.
     */
    private String formatEventForContext(FinanceEvent event) {
        StringBuilder sb = new StringBuilder();
        sb.append("- \"").append(event.name).append("\"");

        if (event.category != null) {
            sb.append(" category=").append(event.category.id).append("(").append(event.category.name).append(")");
        }

        if (event.type != null) {
            sb.append(" type=").append(event.type);
        }

        if (event.transaction != null && event.transaction.lineItems != null) {
            for (FinanceLineItem li : event.transaction.lineItems) {
                if (li.financeNode != null) {
                    String role = li.amount != null && li.amount.compareTo(BigDecimal.ZERO) < 0 ? "source" : "dest";
                    sb.append(" ").append(role).append("=")
                            .append(li.financeNode.id).append("(").append(li.financeNode.name).append(")");
                }
            }
        }

        return sb.toString();
    }

    // -------------------------------------------------------------------------
    // Fallback Logic
    // -------------------------------------------------------------------------

    /**
     * Applies fallback values from historical events if the LLM couldn't resolve
     * nodes or category. Uses the most frequently used node/category from similar events.
     */
    private void applyFallbacksFromHistory(FinanceEventExtractionDto extraction) {
        boolean needsNodeFallback = extraction.getSourceNodeId() == null || extraction.getDestinationNodeId() == null;
        boolean needsCategoryFallback = extraction.getCategoryId() == null;

        if (!needsNodeFallback && !needsCategoryFallback) {
            return; // All resolved, no fallback needed
        }

        List<FinanceEvent> similarEvents = findSimilarEvents(extraction.getName());

        if (similarEvents.isEmpty()) {
            return;
        }

        // Fallback for source node: most frequent source (negative amount) in similar events
        if (extraction.getSourceNodeId() == null) {
            extraction.setSourceNodeId(findMostFrequentNodeId(similarEvents, true));
        }

        // Fallback for destination node: most frequent destination (positive amount) in similar events
        if (extraction.getDestinationNodeId() == null) {
            extraction.setDestinationNodeId(findMostFrequentNodeId(similarEvents, false));
        }

        // Fallback for category: most frequent category in similar events
        if (extraction.getCategoryId() == null) {
            extraction.setCategoryId(findMostFrequentCategoryId(similarEvents));
        }

        // Fallback for event type
        if (extraction.getEventType() == null) {
            extraction.setEventType(findMostFrequentEventType(similarEvents));
        }
    }

    /**
     * Finds the most frequently used node ID from a list of events.
     *
     * @param isSource if true, looks for source nodes (negative amounts);
     *                 if false, looks for destination nodes (positive amounts)
     */
    private Long findMostFrequentNodeId(List<FinanceEvent> events, boolean isSource) {
        Map<Long, Integer> frequency = new HashMap<>();

        for (FinanceEvent event : events) {
            if (event.transaction == null || event.transaction.lineItems == null) {
                continue;
            }
            for (FinanceLineItem li : event.transaction.lineItems) {
                if (li.financeNode == null || li.financeNode.id == null) {
                    continue;
                }
                boolean isNegative = li.amount != null && li.amount.compareTo(BigDecimal.ZERO) < 0;
                if ((isSource && isNegative) || (!isSource && !isNegative)) {
                    frequency.merge(li.financeNode.id, 1, Integer::sum);
                }
            }
        }

        return frequency.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(null);
    }

    /**
     * Finds the most frequently used category ID from a list of events.
     */
    private Long findMostFrequentCategoryId(List<FinanceEvent> events) {
        Map<Long, Integer> frequency = new HashMap<>();

        for (FinanceEvent event : events) {
            if (event.category != null && event.category.id != null) {
                frequency.merge(event.category.id, 1, Integer::sum);
            }
        }

        return frequency.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(null);
    }

    /**
     * Finds the most frequent event type from a list of events.
     */
    private EventType findMostFrequentEventType(List<FinanceEvent> events) {
        Map<EventType, Integer> frequency = new HashMap<>();

        for (FinanceEvent event : events) {
            if (event.type != null) {
                frequency.merge(event.type, 1, Integer::sum);
            }
        }

        return frequency.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(EventType.OUTBOUND);
    }

    // -------------------------------------------------------------------------
    // Event Construction & Persistence
    // -------------------------------------------------------------------------

    /**
     * Builds a FinanceEvent entity from the fully-resolved extraction DTO
     * and delegates persistence to EventService.
     */
    private FinanceEventDto buildAndPersistEvent(String inputText, FinanceEventExtractionDto extraction)
            throws BusinessException {

        FinanceEvent event = new FinanceEvent();
        event.name = extraction.getName();
        event.description = "Created intelligently from: " + inputText;
        event.type = extraction.getEventType() != null ? extraction.getEventType() : inferEventType(extraction);

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
                transactionDate = LocalDate.parse(extraction.getTransactionDate(), DateTimeFormatter.ISO_LOCAL_DATE)
                        .atStartOfDay();
            } catch (Exception e) {
                // If parsing fails, stick with current time
            }
        }
        transaction.transactionDate = transactionDate;

        List<FinanceLineItem> lineItems = new ArrayList<>();
        BigDecimal amount = extraction.getAmount();

        if (amount != null && amount.compareTo(BigDecimal.ZERO) > 0) {
            // Source node (negative amount = money leaves)
            if (extraction.getSourceNodeId() != null) {
                FinanceLineItem sourceItem = new FinanceLineItem();
                sourceItem.amount = amount.negate();
                FinanceNode sourceNode = new FinanceNode();
                sourceNode.id = extraction.getSourceNodeId();
                sourceItem.financeNode = sourceNode;
                sourceItem.transaction = transaction;
                lineItems.add(sourceItem);
            }

            // Destination node (positive amount = money arrives)
            if (extraction.getDestinationNodeId() != null) {
                FinanceLineItem destItem = new FinanceLineItem();
                destItem.amount = amount;
                FinanceNode destNode = new FinanceNode();
                destNode.id = extraction.getDestinationNodeId();
                destItem.financeNode = destNode;
                destItem.transaction = transaction;
                lineItems.add(destItem);
            }
        }

        if (lineItems.isEmpty()) {
            throw new BusinessException(messages.get(MsgKey.AI_EXTRACTION_FAILED));
        }

        transaction.lineItems = lineItems;
        event.transaction = transaction;

        // Delegate persistence and validation to the existing service
        return eventService.create(event);
    }

    /**
     * Infers the EventType based on the resolved node types.
     * If the source is OWN and destination is EXTERNAL/CONTACT → OUTBOUND.
     * If the source is EXTERNAL and destination is OWN → INBOUND.
     * Otherwise → OTHER.
     */
    private EventType inferEventType(FinanceEventExtractionDto extraction) {
        if (extraction.getSourceNodeId() == null || extraction.getDestinationNodeId() == null) {
            return EventType.OUTBOUND; // Default assumption
        }

        try {
            FinanceNode source = financeNodeRepository.findById(extraction.getSourceNodeId());
            FinanceNode dest = financeNodeRepository.findById(extraction.getDestinationNodeId());

            if (source == null || dest == null) {
                return EventType.OUTBOUND;
            }

            if (source.type == FinanceNodeType.OWN
                    && (dest.type == FinanceNodeType.EXTERNAL || dest.type == FinanceNodeType.CONTACT)) {
                return EventType.OUTBOUND;
            }

            if ((source.type == FinanceNodeType.EXTERNAL || source.type == FinanceNodeType.CONTACT)
                    && dest.type == FinanceNodeType.OWN) {
                return EventType.INBOUND;
            }

            if (source.type == FinanceNodeType.OWN && dest.type == FinanceNodeType.OWN) {
                return EventType.OTHER;
            }

            return EventType.OUTBOUND;
        } catch (Exception e) {
            return EventType.OUTBOUND;
        }
    }

    // -------------------------------------------------------------------------
    // LLM Utilities
    // -------------------------------------------------------------------------

    /**
     * Calls the configured LLM with a plain text prompt and returns the response.
     */
    private String callLlm(String prompt) {
        try {
            LOG.debugv("LLM prompt:\n{0}", prompt);

            ChatRequest chatRequest = ChatRequest.builder()
                    .messages(UserMessage.from(prompt))
                    .build();
            ChatResponse chatResponse = chatModel.chat(chatRequest);
            AiMessage aiMessage = chatResponse.aiMessage();
            String text = aiMessage.text();

            LOG.debugv("LLM response:\n{0}", text);

            return text;
        } catch (Exception e) {
            LOG.warnv("LLM call failed: {0}", e.getMessage());
            return null;
        }
    }

    // -------------------------------------------------------------------------
    // Parsing Utilities
    // -------------------------------------------------------------------------

    /**
     * Extracts the most relevant pipe-delimited line from an LLM response.
     * Small models often add explanations before/after the actual answer.
     * This method finds lines containing '|' and picks the best candidate.
     */
    private String extractPipedLine(String response) {
        if (response == null) {
            return null;
        }

        // Split by newlines and find lines with pipes
        String[] lines = response.split("\\n");
        List<String> pipedLines = new ArrayList<>();

        for (String line : lines) {
            String trimmed = line.trim();
            // Skip empty lines, lines starting with common explanation prefixes
            if (trimmed.isEmpty() || trimmed.startsWith("//") || trimmed.startsWith("#")) {
                continue;
            }
            if (trimmed.contains("|")) {
                // Clean up: remove leading "-> " or "Answer: " prefixes
                trimmed = trimmed.replaceAll("^.*->\\s*", "");
                trimmed = trimmed.replaceAll("(?i)^(answer|respuesta|result|resultado)\\s*:\\s*", "");
                pipedLines.add(trimmed.trim());
            }
        }

        if (pipedLines.isEmpty()) {
            return null;
        }

        // Prefer the last piped line (models often include examples then the actual answer)
        return pipedLines.get(pipedLines.size() - 1);
    }

    /**
     * Safely parses a string to Long, returning null on failure.
     */
    private Long parseLongSafe(String value) {
        if (value == null) {
            return null;
        }
        try {
            return Long.parseLong(value.trim().replaceAll("[^\\d]", ""));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * Checks if a value represents "none" or "null" in the pipe-delimited response.
     */
    private boolean isNone(String value) {
        if (value == null) {
            return true;
        }
        String trimmed = value.trim().toLowerCase();
        return trimmed.isEmpty()
                || trimmed.equals("none")
                || trimmed.equals("null")
                || trimmed.equals("n/a")
                || trimmed.equals("-");
    }
}