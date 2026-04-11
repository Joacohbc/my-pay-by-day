package com.mypaybyday.validation;

import com.mypaybyday.entity.CategoryEntity;
import com.mypaybyday.exception.BusinessException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class CategoryValidator {

    @Inject
    RegexValidator regexValidator;

    public void validate(CategoryEntity category) throws BusinessException {
        if (category == null) return;
        regexValidator.validateName(category.name);
        regexValidator.validateDescription(category.description);
        regexValidator.validateIcon(category.icon);
    }
}
