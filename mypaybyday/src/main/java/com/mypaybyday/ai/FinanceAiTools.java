package com.mypaybyday.ai;

import com.mypaybyday.dto.CategoryDto;
import com.mypaybyday.dto.FinanceNodeDto;
import com.mypaybyday.dto.TagDto;
import com.mypaybyday.dto.TimePeriodDto;
import com.mypaybyday.enums.EventType;
import com.mypaybyday.service.CategoryService;
import com.mypaybyday.service.FinanceNodeService;
import com.mypaybyday.service.TagService;
import com.mypaybyday.service.TimePeriodService;
import com.mypaybyday.dto.EventQuery;
import com.mypaybyday.dto.IntelligentEventResponseDto;
import com.mypaybyday.dto.RawTextEventRequestDto;
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

	@Inject
	FinanceNodeService financeNodeService;

	@Inject
	CategoryService categoryService;

	@Inject
	TagService tagService;

	@Inject
	TimePeriodService timePeriodService;

	@Inject
	EventService eventService;

	@Inject
	IntelligentEventService intelligentEventService;

	private static final int PAGE_SIZE = 50;

	@Tool("Returns active (non-archived) finance nodes: accounts, wallets, credit cards, external entities, and contacts. " +
			"Each entry contains id, name, and type (OWN, EXTERNAL, or CONTACT). " +
			"Use this tool when the user asks about nodes, accounts, wallets, or when you need to map a node name to its ID. " +
			"Paginated: pass 'page' starting at 0. Call multiple times with increasing 'page' if you need more records.")
	@Transactional
	public String getFinanceNodes(int page) {
		List<FinanceNodeDto> nodes = financeNodeService.listAll(page, PAGE_SIZE, false).content();
		return AiToolUtils.formatFinanceNodes(nodes, "No finance nodes found on this page.");
	}

	@Tool("Returns budget categories. Each entry contains id and name. " +
			"Use this tool when the user asks about categories or when you need to map a category name to its ID. " +
			"Paginated: pass 'page' starting at 0. Call multiple times with increasing 'page' if you need more records.")
	@Transactional
	public String getCategories(int page) {
		List<CategoryDto> categories = categoryService.listAll(page, PAGE_SIZE).content();
		return AiToolUtils.formatCategories(categories, "No categories found on this page.");
	}

	@Tool("Returns available tags. Each entry contains id and name. " +
			"Use this tool when the user asks about tags or when you need to resolve tag names to IDs. " +
			"Paginated: pass 'page' starting at 0. Call multiple times with increasing 'page' if you need more records.")
	@Transactional
	public String getTags(int page) {
		List<TagDto> tags = tagService.listAll(page, PAGE_SIZE).content();
		return AiToolUtils.formatTags(tags, "No tags found on this page.");
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

	@Tool("Returns time periods (budget containers) with their start date, end date, name, budget limit, and savings goal percentage. " +
			"Use this tool when the user asks about budgets, spending limits, or savings goals for a period. " +
			"Paginated: pass 'page' starting at 0. Call multiple times with increasing 'page' if you need more records.")
	@Transactional
	public String getTimePeriods(int page) {
		List<TimePeriodDto> periods = timePeriodService.listAll(page, PAGE_SIZE).content();
		return AiToolUtils.formatTimePeriods(periods, "No time periods found on this page.");
	}

	@Tool("Creates a finance event from a raw text description. Use this tool when the user wants to log a new financial transaction (e.g., from a receipt, invoice, or verbal description like 'I paid $5 for coffee').\n" +
			"CRITICAL INSTRUCTIONS:\n" +
			"1. The 'description' parameter MUST contain the ACTUAL transaction details (e.g. 'Coffee at Starbucks $5').\n" +
			"2. NEVER pass a placeholder like '{text}', empty strings, or conversational filler. The AI strictly requires real transaction data.\n" +
			"3. If the user provided an image or receipt, pass the complete summarized details of that receipt.\n" +
			"Returns a summary of the created event or draft (if data was incomplete). Call this ONCE per individual transaction.")
	public String createEventFromText(@P("The exact, literal text containing the transaction details to be extracted. NEVER use placeholders.") String description) {
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
