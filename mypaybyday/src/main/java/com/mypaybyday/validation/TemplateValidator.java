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
        regexValidator.validateName(template.name);
        regexValidator.validateDescription(template.description);
    }
}
