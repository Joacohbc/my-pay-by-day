package com.mypaybyday.validation;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.CategoryEntity;
import com.mypaybyday.exception.BusinessException;

@ApplicationScoped
public class CategoryValidator {

    private final RegexValidator regexValidator;

    public CategoryValidator(RegexValidator regexValidator) {
        this.regexValidator = regexValidator;
    }

    public void validate(CategoryEntity category) throws BusinessException {
        if (category == null) return;
        regexValidator.validateLettersAndNumbers(category.name, RegexValidator.SHORT_MAX_LENGTH);
        regexValidator.validateLettersNumbersAndExtras(category.description, RegexValidator.LONG_MAX_LENGTH);
        regexValidator.validateIcon(category.icon);
    }
}
