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
import java.util.stream.Collectors;

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
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.logging.Log;
import io.quarkus.panache.common.Page;

@ApplicationScoped
public class EventGetService {

	private final EventRepository eventRepository;
	private final CategoryService categoryService;
	private final Messages messages;

	public EventGetService(EventRepository eventRepository, CategoryService categoryService, Messages messages) {
		this.eventRepository = eventRepository;
		this.categoryService = categoryService;
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
			List<FinanceEventDto> content = matchingEvents.subList(start, end)
					.stream()
					.map(FinanceEventDto::from)
					.toList();
			return PagedResponse.of(content, queryRequest.page(), queryRequest.size(), totalElements);
		}

		long totalElements = panacheQuery.count();
		List<FinanceEventDto> content = panacheQuery
				.page(Page.of(queryRequest.page(), queryRequest.size()))
				.stream()
				.map(FinanceEventDto::from)
				.toList();
		return PagedResponse.of(content, queryRequest.page(), queryRequest.size(), totalElements);
	}

	/**
	* Aggregate income/outbound/transfer totals across every event matching the query's filters,
	* independent of pagination. Mirrors {@link com.mypaybyday.service.TimePeriodService#getBalance}'s
	* aggregation so a filtered event list and its own totals card never disagree.
	*/
	@Transactional
	public EventTotalsDto summary(EventQuery queryRequest) {
		List<FinanceEventEntity> matchingEvents = applyInMemoryFilters(buildFilteredQuery(queryRequest).list(), queryRequest);

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

	private PanacheQuery<FinanceEventEntity> buildFilteredQuery(EventQuery queryRequest) {
		StringBuilder query = new StringBuilder("select e from FinanceEvent e where 1=1");
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
		return eventRepository.find(query.toString(), params);
	}

	private boolean requiresInMemoryFiltering(EventQuery queryRequest) {
		boolean hasSearch = queryRequest.search() != null && !queryRequest.search().isBlank();
		boolean hasAmountRange = queryRequest.minAmount() != null || queryRequest.maxAmount() != null;
		return hasSearch || hasAmountRange;
	}

	private List<FinanceEventEntity> applyInMemoryFilters(List<FinanceEventEntity> events, EventQuery queryRequest) {
		if (!requiresInMemoryFiltering(queryRequest)) {
			return events;
		}

		boolean hasSearch = queryRequest.search() != null && !queryRequest.search().isBlank();
		boolean hasAmountRange = queryRequest.minAmount() != null || queryRequest.maxAmount() != null;
		Log.debugf("Event search using in-memory filtering (search=%b amountRange=%b)", hasSearch, hasAmountRange);
		String searchLower = hasSearch ? queryRequest.search().toLowerCase() : null;

		return events.stream()
				.filter(event -> {
					if (hasSearch) {
						boolean nameMatch = event.name != null && event.name.toLowerCase().contains(searchLower);
						boolean descriptionMatch = event.description != null && event.description.toLowerCase().contains(searchLower);
						boolean categoryMatch = event.category != null
								&& event.category.name != null
								&& event.category.name.toLowerCase().contains(searchLower);
						if (!nameMatch && !descriptionMatch && !categoryMatch) return false;
					}
					if (hasAmountRange) {
						BigDecimal total = eventTotalAmount(event);
						if (queryRequest.minAmount() != null && total.compareTo(queryRequest.minAmount()) < 0) return false;
						if (queryRequest.maxAmount() != null && total.compareTo(queryRequest.maxAmount()) > 0) return false;
					}
					return true;
				})
				.collect(Collectors.toList());
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
		return FinanceEventDto.from(event);
	}

	@Transactional
	public List<FinanceEventDto> findByDateRange(LocalDateTime from, LocalDateTime to) throws BusinessException {
		return findEventEntitiesByDateRange(from, to).stream().map(FinanceEventDto::from).toList();
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
