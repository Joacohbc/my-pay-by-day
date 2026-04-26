package com.mypaybyday.validation;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.FinanceNodeEntity;
import com.mypaybyday.exception.BusinessException;

@ApplicationScoped
public class FinanceNodeValidator {

    private final RegexValidator regexValidator;

    public FinanceNodeValidator(RegexValidator regexValidator) {
        this.regexValidator = regexValidator;
    }

    public void validate(FinanceNodeEntity node) throws BusinessException {
        if (node == null) return;

        node.name = regexValidator.sanitize(node.name);
        node.description = regexValidator.sanitize(node.description);
        node.icon = regexValidator.sanitize(node.icon);

        regexValidator.validateText(node.name, RegexValidator.SHORT_MAX_LENGTH);
        regexValidator.validateText(node.description, RegexValidator.LONG_MAX_LENGTH);
        regexValidator.validateIcon(node.icon);
    }
}
