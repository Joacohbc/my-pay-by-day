package com.mypaybyday.validation;

import java.util.regex.Pattern;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;

@ApplicationScoped
public class RegexValidator {

    public static final int SHORT_MAX_LENGTH = 255;
    public static final int LONG_MAX_LENGTH = 5100;
    public static final int ICON_MAX_LENGTH = 255;

    private static final Pattern ONLY_LETTERS_PATTERN = Pattern.compile("^[\\p{L}\\s]+$");
    private static final Pattern ONLY_NUMBERS_PATTERN = Pattern.compile("^[\\p{N}]+$");
    private static final Pattern LETTERS_AND_NUMBERS_PATTERN = Pattern.compile("^[\\p{L}\\p{N}\\s\\-\\.]+$");
    private static final Pattern LETTERS_NUMBERS_AND_EXTRAS_PATTERN = Pattern.compile("^[\\p{L}\\p{N}\\s\\p{Punct}]+$");
    private static final Pattern ICON_PATTERN = Pattern.compile("^[a-zA-Z0-9_]+$");

    private final Messages messages;

    public RegexValidator(Messages messages) {
        this.messages = messages;
    }

    public void validateOnlyLetters(String value, int maxLength) throws BusinessException {
        if (value == null || value.isBlank()) return;
        if (value.length() > maxLength) {
            throw new BusinessException(messages.get(MsgKey.VALIDATION_MAX_LENGTH, maxLength));
        }
        if (!ONLY_LETTERS_PATTERN.matcher(value).matches()) {
            throw new BusinessException(messages.get(MsgKey.VALIDATION_ONLY_LETTERS_INVALID_CHARS));
        }
    }

    public void validateOnlyNumbers(String value, int maxLength) throws BusinessException {
        if (value == null || value.isEmpty()) return;
        if (value.length() > maxLength) {
            throw new BusinessException(messages.get(MsgKey.VALIDATION_MAX_LENGTH, maxLength));
        }
        if (!ONLY_NUMBERS_PATTERN.matcher(value).matches()) {
            throw new BusinessException(messages.get(MsgKey.VALIDATION_ONLY_NUMBERS_INVALID_CHARS));
        }
    }

    public void validateLettersAndNumbers(String value, int maxLength) throws BusinessException {
        if (value == null || value.isBlank()) return;
        if (value.length() > maxLength) {
            throw new BusinessException(messages.get(MsgKey.VALIDATION_MAX_LENGTH, maxLength));
        }
        if (!LETTERS_AND_NUMBERS_PATTERN.matcher(value).matches()) {
            throw new BusinessException(messages.get(MsgKey.VALIDATION_LETTERS_AND_NUMBERS_INVALID_CHARS));
        }
    }

    public void validateLettersNumbersAndExtras(String value, int maxLength) throws BusinessException {
        if (value == null || value.isEmpty()) return;
        if (value.length() > maxLength) {
            throw new BusinessException(messages.get(MsgKey.VALIDATION_MAX_LENGTH, maxLength));
        }
        if (!LETTERS_NUMBERS_AND_EXTRAS_PATTERN.matcher(value).matches()) {
            throw new BusinessException(messages.get(MsgKey.VALIDATION_LETTERS_NUMBERS_EXTRAS_INVALID_CHARS));
        }
    }

    /**
     * Validates the standard name + description pair shared by Template, Subscription, and Event entities.
     * Mirrors the shared field builders in frontend/src/lib/validation.ts.
     */
    public void validateNameAndDescription(String name, String description) throws BusinessException {
        validateLettersAndNumbers(name, SHORT_MAX_LENGTH);
        validateLettersNumbersAndExtras(description, LONG_MAX_LENGTH);
    }

    public void validateIcon(String value) throws BusinessException {
        if (value == null || value.isEmpty()) return;
        if (value.length() > ICON_MAX_LENGTH) {
            throw new BusinessException(messages.get(MsgKey.VALIDATION_MAX_LENGTH, ICON_MAX_LENGTH));
        }
        if (!ICON_PATTERN.matcher(value).matches()) {
            throw new BusinessException(messages.get(MsgKey.VALIDATION_ICON_INVALID_CHARS));
        }
    }
}
