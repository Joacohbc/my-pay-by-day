package com.mypaybyday.validation;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import com.mypaybyday.entity.TemplateEntity;
import com.mypaybyday.exception.BusinessException;

@ApplicationScoped
public class TemplateValidator {

    @Inject
    RegexValidator regexValidator;

    public void validate(TemplateEntity template) throws BusinessException {
        if (template == null) return;
        regexValidator.validateNameAndDescription(template.name, template.description);
    }
}
