package com.mypaybyday.service;

import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.TimePeriodBalanceDto;
import com.mypaybyday.entity.FinanceEvent;
import com.mypaybyday.entity.TimePeriod;
import com.mypaybyday.enums.EventType;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.repository.TimePeriodRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@ApplicationScoped
public class TimePeriodService {

    @Inject
    TimePeriodRepository timePeriodRepository;

    @Inject
    EventService eventService;

    // -------------------------------------------------------------------------
    // Queries
    // -------------------------------------------------------------------------

    public List<TimePeriod> listAll() {
        return timePeriodRepository.listAll();
    }

    public TimePeriod findById(Long id) throws BusinessException {
        TimePeriod timePeriod = timePeriodRepository.findById(id);
        if (timePeriod == null) {
            throw new BusinessException("TimePeriod not found: " + id);
        }
        return timePeriod;
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
        TimePeriod timePeriod = findById(id);

        LocalDateTime from = timePeriod.startDate.atStartOfDay();
        LocalDateTime to   = timePeriod.endDate.atTime(LocalTime.MAX);

        List<FinanceEvent> events = eventService.findByDateRange(from, to);

        BigDecimal income   = BigDecimal.ZERO;
        BigDecimal outbound = BigDecimal.ZERO;

        for (FinanceEvent event : events) {
            if (event.transaction == null || event.transaction.lineItems == null) {
                continue;
            }

            // The "amount" of an event = sum of its positive line items.
            // By the Zero-Sum Rule, this equals the sum of its absolute negative line items.
            BigDecimal eventAmount = event.transaction.lineItems.stream()
                    .map(li -> li.amount)
                    .filter(a -> a.compareTo(BigDecimal.ZERO) > 0)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            if (event.type == EventType.INBOUND) {
                income = income.add(eventAmount);
            } else if (event.type == EventType.OUTBOUND) {
                outbound = outbound.add(eventAmount);
            }
        }

        List<FinanceEventDto> eventDtos = events.stream().map(FinanceEventDto::from).toList();
        return new TimePeriodBalanceDto(timePeriod, income, outbound, eventDtos);
    }

    // -------------------------------------------------------------------------
    // Commands
    // -------------------------------------------------------------------------

    @Transactional
    public TimePeriod create(TimePeriod timePeriod) throws BusinessException {
        validatePeriod(timePeriod);
        timePeriodRepository.persist(timePeriod);
        return timePeriod;
    }

    @Transactional
    public TimePeriod patch(Long id, TimePeriod timePeriodDetails) throws BusinessException {
        TimePeriod timePeriod = findById(id);

        if (timePeriodDetails.name != null) {
            if (timePeriodDetails.name.isBlank()) {
                throw new BusinessException("TimePeriod name must not be blank");
            }
            timePeriod.name = timePeriodDetails.name;
        }
        if (timePeriodDetails.startDate != null) {
            timePeriod.startDate = timePeriodDetails.startDate;
        }
        if (timePeriodDetails.endDate != null) {
            timePeriod.endDate = timePeriodDetails.endDate;
        }
        if (timePeriod.endDate.isBefore(timePeriod.startDate)) {
            throw new BusinessException("TimePeriod endDate must not be before startDate");
        }
        if (timePeriodDetails.category != null) {
            timePeriod.category = timePeriodDetails.category;
        }
        if (timePeriodDetails.budgetedAmount != null) {
            timePeriod.budgetedAmount = timePeriodDetails.budgetedAmount;
        }
        if (timePeriodDetails.savingsPercentageGoal != null) {
            if (timePeriodDetails.savingsPercentageGoal.compareTo(BigDecimal.ZERO) < 0
                    || timePeriodDetails.savingsPercentageGoal.compareTo(new BigDecimal("100")) > 0) {
                throw new BusinessException("savingsPercentageGoal must be between 0 and 100");
            }
            timePeriod.savingsPercentageGoal = timePeriodDetails.savingsPercentageGoal;
        }

        return timePeriod;
    }

    @Transactional
    public void delete(Long id) throws BusinessException {
        TimePeriod timePeriod = findById(id);
        timePeriodRepository.delete(timePeriod);
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    private void validatePeriod(TimePeriod tp) throws BusinessException {
        if (tp.name == null || tp.name.isBlank()) {
            throw new BusinessException("TimePeriod name must not be blank");
        }
        if (tp.startDate == null) {
            throw new BusinessException("TimePeriod startDate must not be null");
        }
        if (tp.endDate == null) {
            throw new BusinessException("TimePeriod endDate must not be null");
        }
        if (tp.endDate.isBefore(tp.startDate)) {
            throw new BusinessException("TimePeriod endDate must not be before startDate");
        }
        if (tp.savingsPercentageGoal != null
                && (tp.savingsPercentageGoal.compareTo(BigDecimal.ZERO) < 0
                    || tp.savingsPercentageGoal.compareTo(new BigDecimal("100")) > 0)) {
            throw new BusinessException("savingsPercentageGoal must be between 0 and 100");
        }
    }
}
