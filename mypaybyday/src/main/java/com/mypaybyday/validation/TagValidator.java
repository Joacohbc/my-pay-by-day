package com.mypaybyday.validation;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import com.mypaybyday.entity.TagEntity;
import com.mypaybyday.exception.BusinessException;

@ApplicationScoped
public class TagValidator {

    @Inject
    RegexValidator regexValidator;

    public void validate(TagEntity tag) throws BusinessException {
        if (tag == null) return;
        regexValidator.validateLettersAndNumbers(tag.name, RegexValidator.SHORT_MAX_LENGTH);
        regexValidator.validateLettersNumbersAndExtras(tag.description, RegexValidator.LONG_MAX_LENGTH);
    }
}
