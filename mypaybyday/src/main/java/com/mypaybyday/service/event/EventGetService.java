package com.mypaybyday.service.event;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.CategoryBalanceDto;
import com.mypaybyday.dto.CurrencyTotalsDto;
import com.mypaybyday.dto.EventQuery;
import com.mypaybyday.dto.EventQuery.DateField;
import com.mypaybyday.dto.EventTotalsDto;
import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.FinanceLineItemDto;
import com.mypaybyday.dto.PagedResponse;
import com.mypaybyday.entity.CategoryEntity;
import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.i18n.TimezoneContext;
import com.mypaybyday.repository.EventRepository;
import com.mypaybyday.service.CategoryService;
import com.mypaybyday.service.CurrencyBalanceAggregator;
import com.mypaybyday.service.currency.DisplayCurrency;
import com.mypaybyday.service.currency.DisplayCurrency.ExpressedEvents;
import com.mypaybyday.service.currency.DisplayCurrencyService;
import com.mypaybyday.service.PaymentPlanService;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.logging.Log;
import io.quarkus.panache.common.Page;

@ApplicationScoped
public class EventGetService {

	private final EventRepository eventRepository;
	private final CategoryService categoryService;
	private final PaymentPlanService paymentPlanService;
	private final Messages messages;
	private final CurrencyBalanceAggregator currencyBalanceAggregator;
	private final DisplayCurrencyService displayCurrencyService;

	public EventGetService(EventRepository eventRepository, CategoryService categoryService,
			PaymentPlanService paymentPlanService, Messages messages,
			CurrencyBalanceAggregator currencyBalanceAggregator,
			DisplayCurrencyService displayCurrencyService) {
		this.eventRepository = eventRepository;
		this.categoryService = categoryService;
		this.paymentPlanService = paymentPlanService;
		this.messages = messages;
		this.currencyBalanceAggregator = currencyBalanceAggregator;
		this.displayCurrencyService = displayCurrencyService;
	}

	@Transactional
	public PagedResponse<FinanceEventDto> listAll(EventQuery queryRequest) throws BusinessException {
		DisplayCurrency display = displayCurrencyService.resolve(queryRequest.currency());
		PanacheQuery<FinanceEventEntity> panacheQuery = buildFilteredQuery(queryRequest, display);

		if (requiresInMemoryFiltering(queryRequest)) {
			List<FinanceEventEntity> matchingEvents = applyInMemoryFilters(panacheQuery.list(), queryRequest);

			int totalElements = matchingEvents.size();
			int start = Math.min(queryRequest.page() * queryRequest.size(), totalElements);
			int end = Math.min(start + queryRequest.size(), totalElements);
			List<FinanceEventDto> content = toDtosWithPlanIds(matchingEvents.subList(start, end));
			return PagedResponse.of(content, queryRequest.page(), queryRequest.size(), totalElements);
		}

		long totalElements = panacheQuery.count();
		List<FinanceEventDto> content = toDtosWithPlanIds(panacheQuery
				.page(Page.of(queryRequest.page(), queryRequest.size()))
				.list());
		return PagedResponse.of(content, queryRequest.page(), queryRequest.size(), totalElements);
	}

	/**
	* Aggregate income/outbound/transfer totals across every event matching the query's filters,
	* independent of pagination. Mirrors {@link com.mypaybyday.service.TimePeriodService#getBalance}'s
	* aggregation so a filtered event list and its own totals card never disagree.
	*
	* <p>The sum runs in Java rather than as a SQL {@code SUM} because
	* {@code FinanceLineItemEntity.amount} is encrypted at rest through a JPA converter: the database
	* only ever sees ciphertext, so the database cannot add it up. That is also why filtering by
	* amount or by text happens in memory.
	*/
	@Transactional
	public EventTotalsDto summary(EventQuery queryRequest) throws BusinessException {
		DisplayCurrency display = displayCurrencyService.resolve(queryRequest.currency());
		List<FinanceEventEntity> matchingEvents = applyInMemoryFilters(
				buildTotalsQuery(queryRequest, display).list(), queryRequest);
		ExpressedEvents expressed = display.express(matchingEvents.stream().map(FinanceEventDto::from).toList());

		Map<String, BigDecimal> incomeByCurrency = new LinkedHashMap<>();
		Map<String, BigDecimal> outboundByCurrency = new LinkedHashMap<>();
		Map<String, BigDecimal> transfersByCurrency = new LinkedHashMap<>();
		Set<String> currencies = new LinkedHashSet<>();
		if (!display.isPerCurrency()) {
			currencies.add(display.code());
		}

		for (FinanceEventDto event : expressed.events()) {
			String currency = event.currency();
			if (currency == null) continue;
			currencies.add(currency);

			switch (event.type()) {
				case INBOUND -> incomeByCurrency.merge(currency, event.amount(), BigDecimal::add);
				case OUTBOUND -> outboundByCurrency.merge(currency, event.amount(), BigDecimal::add);
				case OTHER -> transfersByCurrency.merge(currency, transferAmount(event), BigDecimal::add);
			}
		}

		List<CurrencyTotalsDto> totals = currencies.stream()
				.map(currency -> new CurrencyTotalsDto(
						currency,
						incomeByCurrency.getOrDefault(currency, BigDecimal.ZERO),
						outboundByCurrency.getOrDefault(currency, BigDecimal.ZERO),
						transfersByCurrency.getOrDefault(currency, BigDecimal.ZERO),
						expressed.unconvertedCount()))
				.toList();

		return new EventTotalsDto(totals, matchingEvents.size());
	}

	/**
	 * The amount an {@code OTHER} event actually moved: half the sum of its absolute line-item
	 * amounts, since per the Zero-Sum Rule every unit leaves one node and reaches another.
	 */
	private BigDecimal transferAmount(FinanceEventDto event) {
		if (event.lineItems() == null) return BigDecimal.ZERO;
		return event.lineItems().stream()
				.map(FinanceLineItemDto::amount)
				.filter(Objects::nonNull)
				.map(BigDecimal::abs)
				.reduce(BigDecimal.ZERO, BigDecimal::add)
				.divide(BigDecimal.valueOf(2));
	}

	private List<FinanceEventDto> toDtosWithPlanIds(List<FinanceEventEntity> events) {
		Map<Long, Long> planIdByEventId = paymentPlanService.findPlanIdsByEventIds(
				events.stream().map(event -> event.id).toList());

		return events.stream()
				.map(FinanceEventDto::from)
				.map(dto -> dto.withPaymentPlanId(planIdByEventId.get(dto.id())))
				.toList();
	}

	private PanacheQuery<FinanceEventEntity> buildFilteredQuery(EventQuery queryRequest, DisplayCurrency display) {
		EventFilterFragment fragment = buildFilterFragment(queryRequest, display);
		return eventRepository.find("select e from FinanceEvent e" + fragment.clause(), fragment.params());
	}

	/**
	* Same match set as {@link #buildFilteredQuery}, with the line items already fetched: the totals
	* read every one of them, and lazy-loading them turns one query into one per event. It cannot be
	* the shared query — a fetch join over a collection makes Hibernate paginate in memory, and the
	* list endpoint paginates.
	*/
	private PanacheQuery<FinanceEventEntity> buildTotalsQuery(EventQuery queryRequest, DisplayCurrency display) {
		EventFilterFragment fragment = buildFilterFragment(queryRequest, display);
		return eventRepository.find(
				"select e from FinanceEvent e left join fetch e.transaction t left join fetch t.lineItems"
						+ fragment.clause(),
				fragment.params());
	}

	private record EventFilterFragment(String clause, Map<String, Object> params) {
	}

	private EventFilterFragment buildFilterFragment(EventQuery queryRequest, DisplayCurrency display) {
		StringBuilder query = new StringBuilder(" where 1=1");
		Map<String, Object> params = new HashMap<>();

		DateField dateField = queryRequest.dateField() != null ? queryRequest.dateField() : DateField.TRANSACTION;
		boolean instantDateField = dateField == DateField.CREATED || dateField == DateField.UPDATED;
		String dateFieldExpression = switch (dateField) {
			case CREATED -> "e.createdAt";
			case UPDATED -> "e.updatedAt";
			case TRANSACTION -> "e.transaction.transactionDate";
		};

		if (queryRequest.startDate() != null && !queryRequest.startDate().isBlank()) {
			query.append(" and ").append(dateFieldExpression).append(" >= :startDate");
			LocalDateTime start = LocalDateTime.parse(queryRequest.startDate());
			if (instantDateField) {
				params.put("startDate", start.toInstant(ZoneOffset.UTC));
			} else {
				params.put("startDate", start);
			}
		}

		if (queryRequest.endDate() != null && !queryRequest.endDate().isBlank()) {
			query.append(" and ").append(dateFieldExpression).append(" <= :endDate");
			LocalDateTime end = LocalDateTime.parse(queryRequest.endDate());
			if (instantDateField) {
				params.put("endDate", end.toInstant(ZoneOffset.UTC));
			} else {
				params.put("endDate", end);
			}
		}

		if (queryRequest.type() != null) {
			query.append(" and e.type = :type");
			params.put("type", queryRequest.type());
		}

		if (queryRequest.categoryId() != null) {
			query.append(" and e.category.id = :categoryId");
			params.put("categoryId", queryRequest.categoryId());
		}

		if (queryRequest.categoryIds() != null && !queryRequest.categoryIds().isEmpty()) {
			query.append(" and e.category.id in :categoryIds");
			params.put("categoryIds", queryRequest.categoryIds());
		}

		if (queryRequest.tagId() != null) {
			query.append(" and exists (select t from Tag t where t.id = :tagId and t member of e.tags)");
			params.put("tagId", queryRequest.tagId());
		}

		if (queryRequest.tagIds() != null && !queryRequest.tagIds().isEmpty()) {
			query.append(" and exists (select t from Tag t where t.id in :tagIds and t member of e.tags)");
			params.put("tagIds", queryRequest.tagIds());
		}

		if (queryRequest.nodeId() != null) {
			query.append(" and exists (select li from FinanceLineItem li where li member of e.transaction.lineItems and li.financeNode.id = :nodeId)");
			params.put("nodeId", queryRequest.nodeId());
		}

		if (display.mode() == DisplayCurrency.Mode.FILTERED) {
			query.append(" and exists (select li from FinanceLineItem li where li member of e.transaction.lineItems and li.currency = :currency)");
			params.put("currency", display.code());
		}

		query.append(" ORDER BY ").append(dateFieldExpression).append(" DESC");
		return new EventFilterFragment(query.toString(), params);
	}

	private boolean hasSearchTerm(EventQuery queryRequest) {
		return queryRequest.search() != null && !queryRequest.search().isBlank();
	}

	private boolean hasAmountRange(EventQuery queryRequest) {
		return queryRequest.minAmount() != null || queryRequest.maxAmount() != null;
	}

	private boolean requiresInMemoryFiltering(EventQuery queryRequest) {
		return hasSearchTerm(queryRequest) || hasAmountRange(queryRequest);
	}

	private List<FinanceEventEntity> applyInMemoryFilters(List<FinanceEventEntity> events, EventQuery queryRequest) {
		if (!requiresInMemoryFiltering(queryRequest)) {
			return events;
		}

		Log.debugf("Event search using in-memory filtering (search=%b amountRange=%b)",
				hasSearchTerm(queryRequest), hasAmountRange(queryRequest));

		return events.stream()
				.filter(event -> matchesSearch(event, queryRequest))
				.filter(event -> matchesAmountRange(event, queryRequest))
				.toList();
	}

	private boolean matchesSearch(FinanceEventEntity event, EventQuery queryRequest) {
		if (!hasSearchTerm(queryRequest)) {
			return true;
		}

		String searchLower = queryRequest.search().toLowerCase();
		boolean nameMatch = event.name != null && event.name.toLowerCase().contains(searchLower);
		boolean descriptionMatch = event.description != null && event.description.toLowerCase().contains(searchLower);
		boolean categoryMatch = event.category != null
				&& event.category.name != null
				&& event.category.name.toLowerCase().contains(searchLower);
		return nameMatch || descriptionMatch || categoryMatch;
	}

	private boolean matchesAmountRange(FinanceEventEntity event, EventQuery queryRequest) {
		if (!hasAmountRange(queryRequest)) {
			return true;
		}

		BigDecimal total = eventTotalAmount(event);
		boolean aboveMinimum = queryRequest.minAmount() == null || total.compareTo(queryRequest.minAmount()) >= 0;
		boolean belowMaximum = queryRequest.maxAmount() == null || total.compareTo(queryRequest.maxAmount()) <= 0;
		return aboveMinimum && belowMaximum;
	}

	private BigDecimal eventTotalAmount(FinanceEventEntity event) {
		if (event.transaction == null || event.transaction.lineItems == null) return BigDecimal.ZERO;
		return event.transaction.lineItems.stream()
				.map(li -> li.amount)
				.filter(a -> a != null && a.compareTo(BigDecimal.ZERO) > 0)
				.reduce(BigDecimal.ZERO, BigDecimal::add);
	}

	@Transactional
	public FinanceEventDto findById(Long id) throws BusinessException {
		FinanceEventEntity event = eventRepository.findById(id);
		if (event == null) {
			throw messages.reject(MsgKey.EVENT_NOT_FOUND);
		}
		return toDtosWithPlanIds(List.of(event)).get(0);
	}

	@Transactional
	public List<FinanceEventDto> findByDateRange(LocalDateTime from, LocalDateTime to) throws BusinessException {
		return toDtosWithPlanIds(findEventEntitiesByDateRange(from, to));
	}

	@Transactional
	public CategoryBalanceDto getCategoryBalance(Long categoryId, LocalDateTime from, LocalDateTime to) throws BusinessException {
		CategoryEntity category = categoryService.findEntityById(categoryId);
		List<FinanceEventDto> eventsInCategory = findEventEntitiesByDateRangeAndCategory(categoryId, from, to).stream()
				.map(FinanceEventDto::from)
				.toList();

		return new CategoryBalanceDto(
				category.id,
				category.name,
				currencyBalanceAggregator.balances(eventsInCategory, Set.of(), DisplayCurrency.perCurrency()));
	}

	private List<FinanceEventEntity> findEventEntitiesByDateRange(LocalDateTime from, LocalDateTime to) throws BusinessException {
		if (from == null || to == null) {
			throw messages.reject(MsgKey.EVENT_DATE_RANGE_NULL);
		}
		if (from.isAfter(to)) {
			throw messages.reject(MsgKey.EVENT_DATE_RANGE_INVALID);
		}
		return eventRepository.list("transaction.transactionDate >= ?1 and transaction.transactionDate <= ?2", from, to);
	}

	private List<FinanceEventEntity> findEventEntitiesByDateRangeAndCategory(Long categoryId, LocalDateTime from, LocalDateTime to)
			throws BusinessException {
		if (from == null || to == null) {
			throw messages.reject(MsgKey.EVENT_DATE_RANGE_NULL);
		}
		if (from.isAfter(to)) {
			throw messages.reject(MsgKey.EVENT_DATE_RANGE_INVALID);
		}
		return eventRepository.list(
				"category.id = ?1 and transaction.transactionDate >= ?2 and transaction.transactionDate <= ?3",
				categoryId,
				from,
				to);
	}
}
