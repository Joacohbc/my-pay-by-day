package com.mypaybyday.service.event;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.CategoryBalanceDto;
import com.mypaybyday.dto.EventQuery;
import com.mypaybyday.dto.EventQuery.DateField;
import com.mypaybyday.dto.EventTotalsDto;
import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.PagedResponse;
import com.mypaybyday.entity.CategoryEntity;
import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.enums.EventType;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.i18n.TimezoneContext;
import com.mypaybyday.repository.EventRepository;
import com.mypaybyday.service.CategoryService;
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

	public EventGetService(EventRepository eventRepository, CategoryService categoryService,
			PaymentPlanService paymentPlanService, Messages messages) {
		this.eventRepository = eventRepository;
		this.categoryService = categoryService;
		this.paymentPlanService = paymentPlanService;
		this.messages = messages;
	}

	@Transactional
	public PagedResponse<FinanceEventDto> listAll(EventQuery queryRequest) {
		PanacheQuery<FinanceEventEntity> panacheQuery = buildFilteredQuery(queryRequest);

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
	public EventTotalsDto summary(EventQuery queryRequest) {
		List<FinanceEventEntity> matchingEvents = applyInMemoryFilters(buildTotalsQuery(queryRequest).list(), queryRequest);

		BigDecimal income = BigDecimal.ZERO;
		BigDecimal outbound = BigDecimal.ZERO;
		BigDecimal transfers = BigDecimal.ZERO;

		for (FinanceEventEntity event : matchingEvents) {
			if (event.transaction == null || event.transaction.lineItems == null) {
				continue;
			}

			if (event.type == EventType.OTHER) {
				transfers = transfers.add(eventTransferAmount(event));
				continue;
			}

			BigDecimal eventAmount = eventTotalAmount(event);
			if (event.type == EventType.INBOUND) {
				income = income.add(eventAmount);
			} else if (event.type == EventType.OUTBOUND) {
				outbound = outbound.add(eventAmount);
			}
		}

		return new EventTotalsDto(income, outbound, transfers, matchingEvents.size());
	}

	private List<FinanceEventDto> toDtosWithPlanIds(List<FinanceEventEntity> events) {
		Map<Long, Long> planIdByEventId = paymentPlanService.findPlanIdsByEventIds(
				events.stream().map(event -> event.id).toList());

		return events.stream()
				.map(FinanceEventDto::from)
				.map(dto -> dto.withPaymentPlanId(planIdByEventId.get(dto.id())))
				.toList();
	}

	private PanacheQuery<FinanceEventEntity> buildFilteredQuery(EventQuery queryRequest) {
		EventFilterFragment fragment = buildFilterFragment(queryRequest);
		return eventRepository.find("select e from FinanceEvent e" + fragment.clause(), fragment.params());
	}

	/**
	* Same match set as {@link #buildFilteredQuery}, with the line items already fetched: the totals
	* read every one of them, and lazy-loading them turns one query into one per event. It cannot be
	* the shared query — a fetch join over a collection makes Hibernate paginate in memory, and the
	* list endpoint paginates.
	*/
	private PanacheQuery<FinanceEventEntity> buildTotalsQuery(EventQuery queryRequest) {
		EventFilterFragment fragment = buildFilterFragment(queryRequest);
		return eventRepository.find(
				"select e from FinanceEvent e left join fetch e.transaction t left join fetch t.lineItems"
						+ fragment.clause(),
				fragment.params());
	}

	private record EventFilterFragment(String clause, Map<String, Object> params) {
	}

	private EventFilterFragment buildFilterFragment(EventQuery queryRequest) {
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

	private BigDecimal eventTransferAmount(FinanceEventEntity event) {
		return event.transaction.lineItems.stream()
				.map(li -> li.amount)
				.filter(a -> a != null)
				.map(BigDecimal::abs)
				.reduce(BigDecimal.ZERO, BigDecimal::add)
				.divide(BigDecimal.valueOf(2));
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
		List<FinanceEventEntity> eventsInCategory = findEventEntitiesByDateRangeAndCategory(categoryId, from, to);

		BigDecimal totalIncome = BigDecimal.ZERO;
		BigDecimal totalOutbound = BigDecimal.ZERO;

		for (FinanceEventEntity event : eventsInCategory) {
			if (event.transaction == null || event.transaction.lineItems == null) {
				continue;
			}

			BigDecimal eventAmount = event.transaction.lineItems.stream()
					.map(lineItem -> lineItem.amount)
					.filter(amount -> amount.compareTo(BigDecimal.ZERO) > 0)
					.reduce(BigDecimal.ZERO, BigDecimal::add);

			if (event.type == EventType.INBOUND) {
				totalIncome = totalIncome.add(eventAmount);
			} else if (event.type == EventType.OUTBOUND) {
				totalOutbound = totalOutbound.add(eventAmount);
			}
		}

		return new CategoryBalanceDto(category.id, category.name, totalIncome, totalOutbound);
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
