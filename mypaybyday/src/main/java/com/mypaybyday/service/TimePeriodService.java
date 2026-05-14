package com.mypaybyday.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.CategoryBudgetSummaryDto;
import com.mypaybyday.dto.CategoryDto;
import com.mypaybyday.dto.DynamicTimePeriodBalanceDto;
import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.PagedResponse;
import com.mypaybyday.dto.PatchTimePeriodDto;
import com.mypaybyday.dto.TimePeriodBalanceDto;
import com.mypaybyday.dto.TimePeriodBudgetDto;
import com.mypaybyday.dto.TimePeriodDto;
import com.mypaybyday.entity.CategoryEntity;
import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.entity.TimePeriodBudgetEntity;
import com.mypaybyday.entity.TimePeriodEntity;
import com.mypaybyday.enums.EventType;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.TimePeriodRepository;
import com.mypaybyday.service.event.EventService;
import com.mypaybyday.validation.DateValidator;
import com.mypaybyday.validation.TimePeriodValidator;
import io.quarkus.panache.common.Page;

@ApplicationScoped
public class TimePeriodService {

	private final TimePeriodRepository timePeriodRepository;
	private final EventService eventService;
	private final CategoryService categoryService;
	private final Messages messages;
	private final TimePeriodValidator timePeriodValidator;
	private final DateValidator dateValidator;

	public TimePeriodService(
			TimePeriodRepository timePeriodRepository,
			EventService eventService,
			CategoryService categoryService,
			Messages messages,
			TimePeriodValidator timePeriodValidator,
			DateValidator dateValidator) {
		this.timePeriodRepository = timePeriodRepository;
		this.eventService = eventService;
		this.categoryService = categoryService;
		this.messages = messages;
		this.timePeriodValidator = timePeriodValidator;
		this.dateValidator = dateValidator;
	}

	// -------------------------------------------------------------------------
	// Queries
	// -------------------------------------------------------------------------

	@Transactional
	public PagedResponse<TimePeriodDto> listAll(int page, int size) {
		long totalElements = timePeriodRepository.count();
		List<TimePeriodDto> content = timePeriodRepository.findAll()
				.page(Page.of(page, size))
				.stream()
				.map(TimePeriodDto::from)
				.toList();
		return PagedResponse.of(content, page, size, totalElements);
	}

	@Transactional
	public TimePeriodDto findById(Long id) throws BusinessException {
		return TimePeriodDto.from(findTimePeriodEntity(id));
	}

	/**
	* Returns a balance summary for the given time period.
	*
	* <p>Events are associated dynamically: any {@link FinanceEventEntity} whose transaction date
	* falls within [{@code startDate}, {@code endDate}] (both endpoints inclusive) is included.
	*
	* <p>Income is the sum of positive line-item amounts across all {@code INBOUND} events;
	* outbound is the equivalent sum for {@code OUTBOUND} events. {@code OTHER} events are
	* listed in the result but do not contribute to either figure.
	*
	* <p>This method must run inside a transaction so that lazy-loaded line items remain
	* accessible throughout the calculation.
	*/
	@Transactional
	public TimePeriodBalanceDto getBalance(Long id) throws BusinessException {
		TimePeriodEntity timePeriod = findTimePeriodEntity(id);

		LocalDateTime from = timePeriod.startDate;
		LocalDateTime to   = timePeriod.endDate;

		List<FinanceEventDto> events = eventService.findByDateRange(from, to);

		BigDecimal income   = BigDecimal.ZERO;
		BigDecimal outbound = BigDecimal.ZERO;

		for (FinanceEventDto event : events) {
			if (event.transactionId() == null || event.lineItems() == null) {
				continue;
			}

			// The "amount" of an event = sum of its positive line items.
			// By the Zero-Sum Rule, this equals the sum of its absolute negative line items.
			BigDecimal eventAmount = event.lineItems().stream()
					.map(li -> li.amount())
					.filter(a -> a.compareTo(BigDecimal.ZERO) > 0)
					.reduce(BigDecimal.ZERO, BigDecimal::add);

			if (event.type() == EventType.INBOUND) {
				income = income.add(eventAmount);
			} else if (event.type() == EventType.OUTBOUND) {
				outbound = outbound.add(eventAmount);
			}
		}

		List<CategoryBudgetSummaryDto> categoryBudgets = calculateCategoryBudgets(timePeriod.budgets, events);

		return new TimePeriodBalanceDto(timePeriod, income, outbound, categoryBudgets, events);
	}

	private List<CategoryBudgetSummaryDto> calculateCategoryBudgets(Set<TimePeriodBudgetEntity> budgets, List<FinanceEventDto> events) {
		if (budgets == null || budgets.isEmpty()) {
			return List.of();
		}

		Map<Long, BigDecimal> spentPerCategory = new HashMap<>();

		for (FinanceEventDto event : events) {
			if (event.type() == EventType.OUTBOUND && event.category() != null) {
				BigDecimal eventAmount = BigDecimal.ZERO;
				if (event.lineItems() != null) {
					eventAmount = event.lineItems().stream()
							.map(li -> li.amount())
							.filter(a -> a.compareTo(BigDecimal.ZERO) > 0)
							.reduce(BigDecimal.ZERO, BigDecimal::add);
				}
				spentPerCategory.merge(event.category().id(), eventAmount, BigDecimal::add);
			}
		}

		return budgets.stream().map(budget -> {
			BigDecimal spent = spentPerCategory.getOrDefault(budget.category.id, BigDecimal.ZERO);
			return new CategoryBudgetSummaryDto(
					CategoryDto.from(budget.category),
					budget.budgetedAmount,
					spent
			);
		}).collect(Collectors.toList());
	}

	@Transactional
	public DynamicTimePeriodBalanceDto getDynamicBalance(LocalDateTime startDate, LocalDateTime endDate) throws BusinessException {
		if (startDate == null || endDate == null) {
			throw new BusinessException(messages.get(MsgKey.TIME_PERIOD_START_DATE_REQUIRED)); // or appropriate generic date message
		}
		dateValidator.validateDateRange(startDate, endDate);

		LocalDateTime from = startDate;
		LocalDateTime to = endDate;

		List<FinanceEventDto> events = eventService.findByDateRange(from, to);

		BigDecimal income = BigDecimal.ZERO;
		BigDecimal outbound = BigDecimal.ZERO;

		for (FinanceEventDto event : events) {
			if (event.transactionId() == null || event.lineItems() == null) {
				continue;
			}

			BigDecimal eventAmount = event.lineItems().stream()
					.map(li -> li.amount())
					.filter(a -> a.compareTo(BigDecimal.ZERO) > 0)
					.reduce(BigDecimal.ZERO, BigDecimal::add);

			if (event.type() == EventType.INBOUND) {
				income = income.add(eventAmount);
			} else if (event.type() == EventType.OUTBOUND) {
				outbound = outbound.add(eventAmount);
			}
		}

		return new DynamicTimePeriodBalanceDto(startDate, endDate, income, outbound, events);
	}

	// -------------------------------------------------------------------------
	// Commands
	// -------------------------------------------------------------------------

	@Transactional
	public TimePeriodDto create(TimePeriodDto dto) throws BusinessException {
		TimePeriodEntity timePeriod = dto.to();
		if (dto.budgets() != null) {
			for (TimePeriodBudgetDto budgetDto : dto.budgets()) {
				if (budgetDto.category() != null && budgetDto.category().id() != null) {
					CategoryEntity category = categoryService.findEntityById(budgetDto.category().id());
					TimePeriodBudgetEntity budget = new TimePeriodBudgetEntity();
					budget.timePeriod = timePeriod;
					budget.category = category;
					budget.budgetedAmount = budgetDto.budgetedAmount() != null ? budgetDto.budgetedAmount() : BigDecimal.ZERO;
					timePeriod.budgets.add(budget);
				}
			}
		}
		validatePeriod(timePeriod);
		timePeriodRepository.persist(timePeriod);
		return TimePeriodDto.from(timePeriod);
	}

	@Transactional
	public TimePeriodDto patch(Long id, PatchTimePeriodDto dto) throws BusinessException {
		TimePeriodEntity timePeriod = findTimePeriodEntity(id);

		if (dto.getName().isPresent()) {
			String name = dto.getName().get();
			if (name == null || name.isBlank()) {
				throw new BusinessException(messages.get(MsgKey.TIME_PERIOD_NAME_REQUIRED));
			}
			timePeriod.name = name;
		}
		if (dto.getStartDate().isPresent()) {
			timePeriod.startDate = dto.getStartDate().get();
		}
		if (dto.getEndDate().isPresent()) {
			timePeriod.endDate = dto.getEndDate().get();
		}
		if (dto.getBudgets().isPresent()) {
			timePeriod.budgets.clear();
			List<TimePeriodBudgetDto> budgets = dto.getBudgets().get();
			if (budgets != null) {
				for (TimePeriodBudgetDto budgetDto : budgets) {
					if (budgetDto.category() != null && budgetDto.category().id() != null) {
						CategoryEntity category = categoryService.findEntityById(budgetDto.category().id());
						TimePeriodBudgetEntity budget = new TimePeriodBudgetEntity();
						budget.timePeriod = timePeriod;
						budget.category = category;
						budget.budgetedAmount = budgetDto.budgetedAmount() != null ? budgetDto.budgetedAmount() : BigDecimal.ZERO;
						timePeriod.budgets.add(budget);
					}
				}
			}
		}
		if (dto.getSavingsPercentageGoal().isPresent()) {
			timePeriod.savingsPercentageGoal = dto.getSavingsPercentageGoal().get();
		}
		if (dto.getBudgetLimit().isPresent()) {
			timePeriod.budgetLimit = dto.getBudgetLimit().get();
		}

		validatePeriod(timePeriod);

		return TimePeriodDto.from(timePeriod);
	}

	@Transactional
	public void delete(Long id) throws BusinessException {
		TimePeriodEntity timePeriod = findTimePeriodEntity(id);
		timePeriodRepository.delete(timePeriod);
	}

	// -------------------------------------------------------------------------
	// Internal helpers
	// -------------------------------------------------------------------------

	private TimePeriodEntity findTimePeriodEntity(Long id) throws BusinessException {
		TimePeriodEntity timePeriod = timePeriodRepository.findById(id);
		if (timePeriod == null) {
			throw new BusinessException(messages.get(MsgKey.TIME_PERIOD_NOT_FOUND, id));
		}
		return timePeriod;
	}

	private void validatePeriod(TimePeriodEntity tp) throws BusinessException {
		if (tp.name == null || tp.name.isBlank()) {
			throw new BusinessException(messages.get(MsgKey.TIME_PERIOD_NAME_REQUIRED));
		}

		timePeriodValidator.validate(tp);

		if (tp.startDate == null) {
			throw new BusinessException(messages.get(MsgKey.TIME_PERIOD_START_DATE_REQUIRED));
		}
		if (tp.endDate == null) {
			throw new BusinessException(messages.get(MsgKey.TIME_PERIOD_END_DATE_REQUIRED));
		}

		BigDecimal sumOfCategoryBudgets = tp.budgets.stream()
				.map(b -> b.budgetedAmount)
				.reduce(BigDecimal.ZERO, BigDecimal::add);

		// If the user set 'null' means that user doesn't want to set a budget limit.
		// If the user set a value, it must be greater than or equal to the sum of category budgets.
		if (tp.budgetLimit != null && tp.budgetLimit.compareTo(sumOfCategoryBudgets) < 0) {
			throw new BusinessException(messages.get(MsgKey.TIME_PERIOD_BUDGET_LIMIT_MINIMUM, sumOfCategoryBudgets));
		}
	}
}
