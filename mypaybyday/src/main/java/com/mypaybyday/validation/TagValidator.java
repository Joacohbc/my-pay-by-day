package com.mypaybyday.validation;

import com.mypaybyday.entity.TagEntity;
import com.mypaybyday.exception.BusinessException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class TagValidator {

    @Inject
    RegexValidator regexValidator;

    public void validate(TagEntity tag) throws BusinessException {
        if (tag == null) return;
        regexValidator.validateName(tag.name);
        regexValidator.validateDescription(tag.description);
    }
}
