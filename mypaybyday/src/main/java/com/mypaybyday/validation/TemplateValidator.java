package com.mypaybyday.validation;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.TemplateEntity;
import com.mypaybyday.exception.BusinessException;

@ApplicationScoped
public class TemplateValidator {

    private final RegexValidator regexValidator;

    public TemplateValidator(RegexValidator regexValidator) {
        this.regexValidator = regexValidator;
    }

    public void validate(TemplateEntity template) throws BusinessException {
        if (template == null) return;

        template.name = regexValidator.sanitize(template.name);
        template.description = regexValidator.sanitize(template.description);

        regexValidator.validateNameAndDescription(template.name, template.description);
    }
}
