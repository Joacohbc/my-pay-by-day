package com.mypaybyday.service;

import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.TimePeriodBalanceDto;
import com.mypaybyday.dto.TimePeriodDto;
import com.mypaybyday.entity.FinanceEvent;
import com.mypaybyday.entity.TimePeriod;
import com.mypaybyday.enums.EventType;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
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

    @Inject
    CategoryService categoryService;

    @Inject
    Messages messages;

    // -------------------------------------------------------------------------
    // Queries
    // -------------------------------------------------------------------------

    public List<TimePeriodDto> listAll() {
        return timePeriodRepository.listAll().stream().map(TimePeriodDto::from).toList();
    }

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

        return new TimePeriodBalanceDto(timePeriod, income, outbound, events);
    }

    // -------------------------------------------------------------------------
    // Commands
    // -------------------------------------------------------------------------

    @Transactional
    public TimePeriodDto create(TimePeriodDto dto) throws BusinessException {
        TimePeriod timePeriod = dto.to();
        if (dto.category() != null && dto.category().id() != null) {
            timePeriod.category = categoryService.findEntityById(dto.category().id());
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
        if (dto.category() != null && dto.category().id() != null) {
            timePeriod.category = categoryService.findEntityById(dto.category().id());
        }
        if (dto.budgetedAmount() != null) {
            timePeriod.budgetedAmount = dto.budgetedAmount();
        }
        if (dto.savingsPercentageGoal() != null) {
            if (dto.savingsPercentageGoal().compareTo(BigDecimal.ZERO) < 0
                    || dto.savingsPercentageGoal().compareTo(new BigDecimal("100")) > 0) {
                throw new BusinessException(messages.get(MsgKey.TIME_PERIOD_SAVINGS_GOAL_RANGE));
            }
            timePeriod.savingsPercentageGoal = dto.savingsPercentageGoal();
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
