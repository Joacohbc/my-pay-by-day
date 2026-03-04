package com.mypaybyday.service;

import com.mypaybyday.entity.TimePeriod;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.repository.TimePeriodRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.util.List;

@ApplicationScoped
public class TimePeriodService {

    @Inject
    TimePeriodRepository timePeriodRepository;

    public List<TimePeriod> listAll() {
        return timePeriodRepository.listAll();
    }

    public TimePeriod findById(Long id) {
        return timePeriodRepository.findById(id);
    }

    @Transactional
    public TimePeriod create(TimePeriod timePeriod) throws BusinessException {
        validateNoOverlap(timePeriod);
        timePeriodRepository.persist(timePeriod);
        return timePeriod;
    }

    @Transactional
    public TimePeriod update(Long id, TimePeriod timePeriodDetails) throws BusinessException {
        TimePeriod timePeriod = timePeriodRepository.findById(id);
        if (timePeriod == null) {
            throw new BusinessException("TimePeriod not found");
        }

        timePeriod.name = timePeriodDetails.name;
        timePeriod.startDate = timePeriodDetails.startDate;
        timePeriod.endDate = timePeriodDetails.endDate;
        timePeriod.category = timePeriodDetails.category;
        timePeriod.budgetedAmount = timePeriodDetails.budgetedAmount;
        timePeriod.savingsPercentageGoal = timePeriodDetails.savingsPercentageGoal;

        validateNoOverlap(timePeriod);

        return timePeriod;
    }

    @Transactional
    public void delete(Long id) throws BusinessException {
        TimePeriod timePeriod = timePeriodRepository.findById(id);
        if (timePeriod == null) {
            throw new BusinessException("TimePeriod not found");
        }
        timePeriodRepository.delete(timePeriod);
    }

    private void validateNoOverlap(TimePeriod timePeriod) throws BusinessException {
        if (timePeriod.category == null) {
            return; // No category, no overlap rule applied (or rule applies to all? Assuming applies by category as requested)
        }

        if (timePeriod.startDate.isAfter(timePeriod.endDate)) {
            throw new BusinessException("Start date cannot be after end date");
        }

        List<TimePeriod> existingPeriods = timePeriodRepository.list("category", timePeriod.category);

        for (TimePeriod existing : existingPeriods) {
            if (timePeriod.id != null && existing.id.equals(timePeriod.id)) {
                continue; // Skip itself during update
            }

            boolean overlaps = !timePeriod.startDate.isAfter(existing.endDate) && !timePeriod.endDate.isBefore(existing.startDate);
            if (overlaps) {
                throw new BusinessException("TimePeriod overlaps with an existing period for the same category");
            }
        }
    }
}
