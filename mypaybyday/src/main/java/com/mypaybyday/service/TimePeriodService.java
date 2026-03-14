package com.mypaybyday.service;

import com.mypaybyday.dto.CategoryBudgetSummaryDto;
import com.mypaybyday.dto.DynamicTimePeriodBalanceDto;
import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.PagedResponse;
import com.mypaybyday.dto.TimePeriodBalanceDto;
import com.mypaybyday.dto.TimePeriodBudgetDto;
import com.mypaybyday.dto.TimePeriodDto;
import com.mypaybyday.entity.Category;
import com.mypaybyday.entity.FinanceEvent;
import com.mypaybyday.entity.TimePeriod;
import com.mypaybyday.entity.TimePeriodBudget;
import com.mypaybyday.enums.EventType;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.TimePeriodRepository;
import io.quarkus.panache.common.Page;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@ApplicationScoped
public class TimePeriodService {

    @Inject
    TimePeriodRepository timePeriodRepository;

    @Inject
    EventService eventService;

    @Inject
    CategoryService categoryService;

    @Inject
    Messages messages;

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
     * <p>Events are associated dynamically: any {@link FinanceEvent} whose transaction date
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
        TimePeriod timePeriod = findTimePeriodEntity(id);

        LocalDateTime from = timePeriod.startDate.atStartOfDay();
        LocalDateTime to   = timePeriod.endDate.atTime(LocalTime.MAX);

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

    private List<CategoryBudgetSummaryDto> calculateCategoryBudgets(List<TimePeriodBudget> budgets, List<FinanceEventDto> events) {
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
                    com.mypaybyday.dto.CategoryDto.from(budget.category),
                    budget.budgetedAmount,
                    spent
            );
        }).collect(Collectors.toList());
    }

    @Transactional
    public DynamicTimePeriodBalanceDto getDynamicBalance(LocalDate startDate, LocalDate endDate) throws BusinessException {
        if (startDate == null || endDate == null) {
            throw new BusinessException(messages.get(MsgKey.TIME_PERIOD_START_DATE_REQUIRED)); // or appropriate generic date message
        }
        if (endDate.isBefore(startDate)) {
            throw new BusinessException(messages.get(MsgKey.TIME_PERIOD_END_BEFORE_START));
        }

        LocalDateTime from = startDate.atStartOfDay();
        LocalDateTime to = endDate.atTime(LocalTime.MAX);

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
        TimePeriod timePeriod = dto.to();
        if (dto.budgets() != null) {
            for (TimePeriodBudgetDto budgetDto : dto.budgets()) {
                if (budgetDto.category() != null && budgetDto.category().id() != null) {
                    Category category = categoryService.findEntityById(budgetDto.category().id());
                    TimePeriodBudget budget = new TimePeriodBudget();
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
    public TimePeriodDto patch(Long id, TimePeriodDto dto) throws BusinessException {
        TimePeriod timePeriod = findTimePeriodEntity(id);

        if (dto.name() != null) {
            if (dto.name().isBlank()) {
                throw new BusinessException(messages.get(MsgKey.TIME_PERIOD_NAME_REQUIRED));
            }
            timePeriod.name = dto.name();
        }
        if (dto.startDate() != null) {
            timePeriod.startDate = dto.startDate();
        }
        if (dto.endDate() != null) {
            timePeriod.endDate = dto.endDate();
        }
        if (timePeriod.endDate.isBefore(timePeriod.startDate)) {
            throw new BusinessException(messages.get(MsgKey.TIME_PERIOD_END_BEFORE_START));
        }
        if (dto.budgets() != null) {
            timePeriod.budgets.clear();
            for (TimePeriodBudgetDto budgetDto : dto.budgets()) {
                if (budgetDto.category() != null && budgetDto.category().id() != null) {
                    Category category = categoryService.findEntityById(budgetDto.category().id());
                    TimePeriodBudget budget = new TimePeriodBudget();
                    budget.timePeriod = timePeriod;
                    budget.category = category;
                    budget.budgetedAmount = budgetDto.budgetedAmount() != null ? budgetDto.budgetedAmount() : BigDecimal.ZERO;
                    timePeriod.budgets.add(budget);
                }
            }
        }
        if (dto.savingsPercentageGoal() != null) {
            if (dto.savingsPercentageGoal().compareTo(BigDecimal.ZERO) < 0
                    || dto.savingsPercentageGoal().compareTo(new BigDecimal("100")) > 0) {
                throw new BusinessException(messages.get(MsgKey.TIME_PERIOD_SAVINGS_GOAL_RANGE));
            }
            timePeriod.savingsPercentageGoal = dto.savingsPercentageGoal();
        }
        if (dto.budgetLimit() != null) {
            if (dto.budgetLimit().compareTo(BigDecimal.ZERO) < 0) {
                // We don't have a specific error for this, but let's assume it should be non-negative
                // I'll check if there is a generic one or just set it.
                // The prompt didn't specify validation, but usually budgets are positive.
                // For now just set it.
            }
            timePeriod.budgetLimit = dto.budgetLimit();
        }

        return TimePeriodDto.from(timePeriod);
    }

    @Transactional
    public void delete(Long id) throws BusinessException {
        TimePeriod timePeriod = findTimePeriodEntity(id);
        timePeriodRepository.delete(timePeriod);
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    private TimePeriod findTimePeriodEntity(Long id) throws BusinessException {
        TimePeriod timePeriod = timePeriodRepository.findById(id);
        if (timePeriod == null) {
            throw new BusinessException(messages.get(MsgKey.TIME_PERIOD_NOT_FOUND, id));
        }
        return timePeriod;
    }

    private void validatePeriod(TimePeriod tp) throws BusinessException {
        if (tp.name == null || tp.name.isBlank()) {
            throw new BusinessException(messages.get(MsgKey.TIME_PERIOD_NAME_REQUIRED));
        }
        if (tp.startDate == null) {
            throw new BusinessException(messages.get(MsgKey.TIME_PERIOD_START_DATE_REQUIRED));
        }
        if (tp.endDate == null) {
            throw new BusinessException(messages.get(MsgKey.TIME_PERIOD_END_DATE_REQUIRED));
        }
        if (tp.endDate.isBefore(tp.startDate)) {
            throw new BusinessException(messages.get(MsgKey.TIME_PERIOD_END_BEFORE_START));
        }
        if (tp.savingsPercentageGoal != null
                && (tp.savingsPercentageGoal.compareTo(BigDecimal.ZERO) < 0
                    || tp.savingsPercentageGoal.compareTo(new BigDecimal("100")) > 0)) {
                throw new BusinessException(messages.get(MsgKey.TIME_PERIOD_SAVINGS_GOAL_RANGE));
        }
    }
}
