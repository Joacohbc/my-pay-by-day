package com.mypaybyday.validation;

import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.regex.Pattern;

@ApplicationScoped
public class RegexValidator {

    public static final int NAME_MAX_LENGTH = 255;
    public static final int DESCRIPTION_MAX_LENGTH = 5100;
    public static final int ICON_MAX_LENGTH = 255;

    // Name: letters, numbers, spaces, dashes, dots
    private static final Pattern NAME_PATTERN = Pattern.compile("^[\\p{L}\\p{N}\\s\\-\\.]+$");

    // Description: letters, numbers, spaces, standard punctuation
    private static final Pattern DESCRIPTION_PATTERN = Pattern.compile("^[\\p{L}\\p{N}\\s\\p{Punct}]+$");

    // Icon: letters, numbers, underscore
    private static final Pattern ICON_PATTERN = Pattern.compile("^[a-zA-Z0-9_]+$");

    @Inject
    Messages messages;

    public void validateName(String name) throws BusinessException {
        if (name == null || name.isBlank()) {
            return; // Handled by other validations (like @NotBlank checks) if required
        }
        if (name.length() > NAME_MAX_LENGTH) {
            throw new BusinessException(messages.get(MsgKey.VALIDATION_NAME_MAX_LENGTH, NAME_MAX_LENGTH));
        }
        if (!NAME_PATTERN.matcher(name).matches()) {
            throw new BusinessException(messages.get(MsgKey.VALIDATION_NAME_INVALID_CHARS));
        }
    }

    public void validateDescription(String description) throws BusinessException {
        if (description == null || description.isEmpty()) {
            return;
        }
        if (description.length() > DESCRIPTION_MAX_LENGTH) {
            throw new BusinessException(messages.get(MsgKey.VALIDATION_DESCRIPTION_MAX_LENGTH, DESCRIPTION_MAX_LENGTH));
        }
        if (!DESCRIPTION_PATTERN.matcher(description).matches()) {
            throw new BusinessException(messages.get(MsgKey.VALIDATION_DESCRIPTION_INVALID_CHARS));
        }
    }

    public void validateIcon(String icon) throws BusinessException {
        if (icon == null || icon.isEmpty()) {
            return;
        }
        if (icon.length() > ICON_MAX_LENGTH) {
            throw new BusinessException(messages.get(MsgKey.VALIDATION_ICON_MAX_LENGTH, ICON_MAX_LENGTH));
        }
        if (!ICON_PATTERN.matcher(icon).matches()) {
            throw new BusinessException(messages.get(MsgKey.VALIDATION_ICON_INVALID_CHARS));
        }
    }
}
