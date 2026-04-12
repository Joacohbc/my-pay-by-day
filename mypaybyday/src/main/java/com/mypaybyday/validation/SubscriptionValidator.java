package com.mypaybyday.validation;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import com.mypaybyday.entity.SubscriptionEntity;
import com.mypaybyday.exception.BusinessException;

@ApplicationScoped
public class SubscriptionValidator {

    @Inject
    RegexValidator regexValidator;

    public void validate(SubscriptionEntity subscription) throws BusinessException {
        if (subscription == null) return;
        regexValidator.validateNameAndDescription(subscription.name, subscription.description);
    }
}
