package com.mypaybyday.validation;

import com.mypaybyday.entity.FinanceNodeEntity;
import com.mypaybyday.exception.BusinessException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class FinanceNodeValidator {

    @Inject
    RegexValidator regexValidator;

    public void validate(FinanceNodeEntity node) throws BusinessException {
        if (node == null) return;
        regexValidator.validateName(node.name);
    }
}
