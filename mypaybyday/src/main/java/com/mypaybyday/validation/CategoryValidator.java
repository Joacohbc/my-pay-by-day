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
        
        category.name = regexValidator.sanitize(category.name);
        category.description = regexValidator.sanitize(category.description);
        category.icon = regexValidator.sanitize(category.icon);

        regexValidator.validateText(category.name, RegexValidator.SHORT_MAX_LENGTH);
        regexValidator.validateText(category.description, RegexValidator.LONG_MAX_LENGTH);
        regexValidator.validateIcon(category.icon);
    }
}
