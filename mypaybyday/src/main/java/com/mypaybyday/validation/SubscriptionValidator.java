package com.mypaybyday.validation;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.SubscriptionEntity;
import com.mypaybyday.exception.BusinessException;

@ApplicationScoped
public class SubscriptionValidator {

    private final RegexValidator regexValidator;
    private final DateValidator dateValidator;

    public SubscriptionValidator(RegexValidator regexValidator, DateValidator dateValidator) {
        this.regexValidator = regexValidator;
        this.dateValidator = dateValidator;
    }

    public void validate(SubscriptionEntity subscription) throws BusinessException {
        if (subscription == null) return;
        regexValidator.validateNameAndDescription(subscription.name, subscription.description);
        dateValidator.validateNotPast(subscription.nextExecutionDate);
    }
}
