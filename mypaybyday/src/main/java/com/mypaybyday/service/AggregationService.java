package com.mypaybyday.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.FinanceLineItemDto;
import com.mypaybyday.entity.TimePeriodEntity;
import com.mypaybyday.enums.EventType;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.FinanceNodeRepository;
import com.mypaybyday.repository.TimePeriodRepository;
import com.mypaybyday.service.event.EventService;
import io.quarkus.logging.Log;

@ApplicationScoped
public class AggregationService {

    private final EventService eventService;
    private final TimePeriodRepository timePeriodRepository;
    private final FinanceNodeRepository financeNodeRepository;
    private final Messages messages;

    public AggregationService(
            EventService eventService,
            TimePeriodRepository timePeriodRepository,
            FinanceNodeRepository financeNodeRepository,
            Messages messages) {
        this.eventService = eventService;
        this.timePeriodRepository = timePeriodRepository;
        this.financeNodeRepository = financeNodeRepository;
        this.messages = messages;
    }

    @Transactional
    public Map<Long, BigDecimal> monthlyByCategory(int year, int month) {
        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDateTime from = yearMonth.atDay(1).atStartOfDay();
        LocalDateTime to = yearMonth.atEndOfMonth().atTime(LocalTime.MAX);
        List<FinanceEventDto> events = eventService.findByDateRange(from, to);
        return aggregateByCategory(events);
    }

    @Transactional
    public Map<Long, BigDecimal> byTagInPeriod(Long periodId) throws BusinessException {
        TimePeriodEntity period = findPeriodEntity(periodId);
        		LocalDateTime from = period.startDate;
        		LocalDateTime to = period.endDate;        List<FinanceEventDto> events = eventService.findByDateRange(from, to);
        return aggregateByTag(events);
    }

    @Transactional
    public BigDecimal nodeBalance(Long nodeId) {
        Log.debugf("Computing full-history node balance for node id=%d", nodeId);
        var node = financeNodeRepository.findById(nodeId);
        if (node == null) {
            return BigDecimal.ZERO;
        }
        List<FinanceEventDto> allEvents = eventService.findByDateRange(
                LocalDateTime.of(2000, 1, 1, 0, 0),
                LocalDateTime.now());
        BigDecimal balance = BigDecimal.ZERO;
        for (FinanceEventDto event : allEvents) {
            if (event.lineItems() == null) continue;
            for (FinanceLineItemDto li : event.lineItems()) {
                if (nodeId.equals(li.financeNodeId())) {
                    balance = balance.add(li.amount());
                }
            }
        }
        return balance;
    }

    @Transactional
    public BigDecimal categorySpendingInPeriod(Long categoryId, Long periodId) throws BusinessException {
        TimePeriodEntity period = findPeriodEntity(periodId);
        		LocalDateTime from = period.startDate;
        		LocalDateTime to = period.endDate;        List<FinanceEventDto> events = eventService.findByDateRange(from, to);
        return events.stream()
                .filter(e -> e.category() != null && categoryId.equals(e.category().id()))
                .filter(e -> e.type() == EventType.OUTBOUND)
                .map(e -> e.amount() != null ? e.amount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private Map<Long, BigDecimal> aggregateByCategory(List<FinanceEventDto> events) {
        Map<Long, BigDecimal> result = new LinkedHashMap<>();
        for (FinanceEventDto event : events) {
            if (event.category() == null || event.amount() == null) continue;
            Long catId = event.category().id();
            result.merge(catId, event.amount(), BigDecimal::add);
        }
        return result;
    }

    private Map<Long, BigDecimal> aggregateByTag(List<FinanceEventDto> events) {
        Map<Long, BigDecimal> result = new LinkedHashMap<>();
        for (FinanceEventDto event : events) {
            if (event.tags() == null || event.amount() == null) continue;
            for (var tag : event.tags()) {
                result.merge(tag.id(), event.amount(), BigDecimal::add);
            }
        }
        return result;
    }

    private TimePeriodEntity findPeriodEntity(Long periodId) throws BusinessException {
        TimePeriodEntity entity = timePeriodRepository.findById(periodId);
        if (entity == null) {
            throw messages.reject(MsgKey.TIME_PERIOD_NOT_FOUND);
        }
        return entity;
    }
}
