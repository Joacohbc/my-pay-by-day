package com.mypaybyday.validation;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.TagEntity;
import com.mypaybyday.exception.BusinessException;

@ApplicationScoped
public class TagValidator {

    private final RegexValidator regexValidator;

    public TagValidator(RegexValidator regexValidator) {
        this.regexValidator = regexValidator;
    }

    public void validate(TagEntity tag) throws BusinessException {
        if (tag == null) return;

        tag.name = regexValidator.sanitize(tag.name);
        tag.description = regexValidator.sanitize(tag.description);

        regexValidator.validateLettersAndNumbers(tag.name, RegexValidator.SHORT_MAX_LENGTH);
        regexValidator.validateLettersNumbersAndExtras(tag.description, RegexValidator.LONG_MAX_LENGTH);
    }
}
