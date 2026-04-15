package com.mypaybyday.ai;

import java.math.BigDecimal;
import java.time.temporal.Temporal;
import java.util.List;
import java.util.Set;
import java.util.HashSet;
import java.util.stream.Collectors;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.EventQuery;
import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.IntelligentEventResponseDto;
import com.mypaybyday.dto.RawTextEventRequestDto;
import com.mypaybyday.entity.CategoryEntity;
import com.mypaybyday.entity.FinanceNodeEntity;
import com.mypaybyday.entity.TagEntity;
import com.mypaybyday.entity.TimePeriodEntity;
import com.mypaybyday.enums.EventType;
import com.mypaybyday.repository.CategoryRepository;
import com.mypaybyday.repository.FinanceNodeRepository;
import com.mypaybyday.repository.TagRepository;
import com.mypaybyday.repository.TimePeriodRepository;
import com.mypaybyday.service.EventService;
import com.mypaybyday.service.IntelligentEventService;
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import io.quarkus.runtime.annotations.RegisterForReflection;
import org.jboss.logging.Logger;

/**
 * AI Tools: exposes financial data to the LLM via @Tool-annotated methods.
 * The LLM decides when to invoke these tools based on the user's question,
 * always fetching fresh data directly from the database.
 */
// Required for Quarkus native image: AgentFinanceEventCreator.buildToolMap() uses reflection
// (getDeclaredMethods + isAnnotationPresent) to discover @Tool methods at runtime.
// Without this, GraalVM strips that metadata during compilation and no tools are registered.
@RegisterForReflection
@ApplicationScoped
public class FinanceAiTools {

	private static final Logger log = Logger.getLogger(FinanceAiTools.class);

	private final FinanceNodeRepository financeNodeRepository;
	private final CategoryRepository categoryRepository;
	private final TagRepository tagRepository;
	private final TimePeriodRepository timePeriodRepository;
	private final EventService eventService;
	private final IntelligentEventService intelligentEventService;

	public FinanceAiTools(
			FinanceNodeRepository financeNodeRepository,
			CategoryRepository categoryRepository,
			TagRepository tagRepository,
			TimePeriodRepository timePeriodRepository,
			EventService eventService,
			IntelligentEventService intelligentEventService) {
		this.financeNodeRepository = financeNodeRepository;
		this.categoryRepository = categoryRepository;
		this.tagRepository = tagRepository;
		this.timePeriodRepository = timePeriodRepository;
		this.eventService = eventService;
		this.intelligentEventService = intelligentEventService;
	}

	@Tool("Returns all active (non-archived) finance nodes: accounts, wallets, credit cards, external entities, and contacts. " +
			"Each entry contains id, name, and type (OWN, EXTERNAL, or CONTACT). " +
			"Use this tool when the user asks about nodes, accounts, wallets, or when you need to map a node name to its ID.")
	@Transactional
	public String getFinanceNodes() {
		List<FinanceNodeEntity> nodes = financeNodeRepository.find("archived", false).list();
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
		List<CategoryEntity> categories = categoryRepository.listAll();
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
			List<TagEntity> tags = tagRepository.listAll();
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
		var response = eventService.listAll(EventQuery.builder().page(0).size(safeLimit).build());

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

			var response = eventService.listAll(EventQuery.builder()
					.page(0).size(50)
					.search(search).startDate(sDate).endDate(eDate)
					.type(eventType).categoryId(categoryId).tagId(tagId)
					.build());

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
		List<TimePeriodEntity> periods = timePeriodRepository.listAll();

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

	@Tool("Creates a finance event from a raw text description. Use this tool when the user wants to log a new financial transaction (e.g., from a receipt, invoice, or verbal description like 'I paid $5 for coffee').\n" +
			"Parameters:\n" +
			"- description: The exact transaction details (e.g. 'Coffee at Starbucks $5'). NEVER pass placeholders or empty strings.\n" +
			"- instructions: Optional user-provided directives that customize how the event is created (e.g. 'use my Visa card', 'categorize as food', 'split equally'). " +
			"  Extract these from the user's message when present; pass null if the user gave no special directives.\n" +
			"CRITICAL RULES:\n" +
			"1. 'description' MUST contain ACTUAL transaction data. The AI strictly requires real data.\n" +
			"2. If the user provided an image or receipt, pass the complete summarized details as 'description'.\n" +
			"3. Call this ONCE per individual transaction.\n" +
			"Returns a summary of the created event or draft (if data was incomplete).")
	public String createEventFromText(
			@P("The exact, literal text containing the transaction details to be extracted. NEVER use placeholders.") String description,
			@P("Optional user directives for how to process the event (e.g. which node/account to use, how to categorize, how to split). Pass null if the user provided no special instructions.") String instructions) {
		try {
			RawTextEventRequestDto request = new RawTextEventRequestDto();
			request.setText(description);
			request.setInstructions(instructions);

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
