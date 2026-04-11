package com.mypaybyday.validation;

import com.mypaybyday.entity.TimePeriodEntity;
import com.mypaybyday.exception.BusinessException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class TimePeriodValidator {

    @Inject
    RegexValidator regexValidator;

    public void validate(TimePeriodEntity timePeriod) throws BusinessException {
        if (timePeriod == null) return;
        regexValidator.validateName(timePeriod.name);
    }
}
