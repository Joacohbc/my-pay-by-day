package com.mypaybyday.validation;

import com.mypaybyday.entity.TemplateEntity;
import com.mypaybyday.exception.BusinessException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class TemplateValidator {

    @Inject
    RegexValidator regexValidator;

    public void validate(TemplateEntity template) throws BusinessException {
        if (template == null) return;
        regexValidator.validateLettersAndNumbers(template.name, RegexValidator.SHORT_MAX_LENGTH);
        regexValidator.validateLettersNumbersAndExtras(template.description, RegexValidator.LONG_MAX_LENGTH);
    }
}
