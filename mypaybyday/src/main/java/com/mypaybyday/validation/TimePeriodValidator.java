package com.mypaybyday.validation;

import java.math.BigDecimal;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.TimePeriodEntity;
import com.mypaybyday.exception.BusinessException;

@ApplicationScoped
public class TimePeriodValidator {

    private final RegexValidator regexValidator;
    private final DateValidator dateValidator;
    private final NumberValidator numberValidator;

    public TimePeriodValidator(RegexValidator regexValidator, DateValidator dateValidator, NumberValidator numberValidator) {
        this.regexValidator = regexValidator;
        this.dateValidator = dateValidator;
        this.numberValidator = numberValidator;
    }

    public void validate(TimePeriodEntity timePeriod) throws BusinessException {
        if (timePeriod == null) return;
        regexValidator.validateLettersAndNumbers(timePeriod.name, RegexValidator.SHORT_MAX_LENGTH);
        dateValidator.validateDateRange(timePeriod.startDate, timePeriod.endDate);
        if (timePeriod.savingsPercentageGoal != null) {
            numberValidator.validateRange(timePeriod.savingsPercentageGoal, BigDecimal.ZERO, new BigDecimal("100"));
        }
    }
}
