package com.mypaybyday.validation;

import com.mypaybyday.entity.SubscriptionEntity;
import com.mypaybyday.exception.BusinessException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class SubscriptionValidator {

    @Inject
    RegexValidator regexValidator;

    public void validate(SubscriptionEntity subscription) throws BusinessException {
        if (subscription == null) return;
        regexValidator.validateName(subscription.name);
        regexValidator.validateDescription(subscription.description);
    }
}
