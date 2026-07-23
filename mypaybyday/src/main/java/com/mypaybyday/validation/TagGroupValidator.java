package com.mypaybyday.validation;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.dto.TagGroupDto;
import com.mypaybyday.entity.TagGroupEntity;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;

@ApplicationScoped
public class TagGroupValidator {

    private static final int MIN_TAGS = 2;

    private final RegexValidator regexValidator;
    private final Messages messages;

    public TagGroupValidator(RegexValidator regexValidator, Messages messages) {
        this.regexValidator = regexValidator;
        this.messages = messages;
    }

    /**
     * Validates and sanitizes the DTO before persisting.
     * Also sanitizes fields on the entity for safe storage.
     */
    public void validate(TagGroupDto dto, TagGroupEntity entity) throws BusinessException {
        // Sanitize
        entity.name = regexValidator.sanitize(dto.name());
        entity.description = regexValidator.sanitize(dto.description());
        entity.icon = dto.icon() != null ? dto.icon().trim() : null;

        // Name: required + text rules
        if (entity.name == null || entity.name.isBlank()) {
            throw messages.reject(MsgKey.TAG_GROUP_NAME_REQUIRED);
        }
        regexValidator.validateText(entity.name, RegexValidator.SHORT_MAX_LENGTH);

        // Description: optional text rules
        regexValidator.validateText(entity.description, RegexValidator.LONG_MAX_LENGTH);

        // Icon: optional, must only contain letters/numbers/underscores (Material Symbol name)
        regexValidator.validateIcon(entity.icon);

        // Tags: at least 2 required
        if (dto.tagIds() == null || dto.tagIds().size() < MIN_TAGS) {
            throw messages.reject(MsgKey.TAG_GROUP_MIN_TAGS);
        }
    }
}
