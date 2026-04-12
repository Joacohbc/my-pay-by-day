package com.mypaybyday.validation;

import com.mypaybyday.entity.TimePeriodEntity;
import com.mypaybyday.exception.BusinessException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.math.BigDecimal;

@ApplicationScoped
public class TimePeriodValidator {

    @Inject
    RegexValidator regexValidator;

    @Inject
    DateValidator dateValidator;

    @Inject
    NumberValidator numberValidator;

    public void validate(TimePeriodEntity timePeriod) throws BusinessException {
        if (timePeriod == null) return;
        regexValidator.validateLettersAndNumbers(timePeriod.name, RegexValidator.SHORT_MAX_LENGTH);
        dateValidator.validateDateRange(timePeriod.startDate, timePeriod.endDate);
        if (timePeriod.savingsPercentageGoal != null) {
            numberValidator.validateRange(timePeriod.savingsPercentageGoal, BigDecimal.ZERO, new BigDecimal("100"));
        }
    }
}
