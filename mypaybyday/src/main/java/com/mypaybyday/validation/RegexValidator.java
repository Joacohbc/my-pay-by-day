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
    public static final int COLOR_MAX_LENGTH = 7;

    private static final Pattern ONLY_LETTERS_PATTERN = Pattern.compile("^[\\p{L}\\s]+$");
    private static final Pattern ONLY_NUMBERS_PATTERN = Pattern.compile("^[\\p{N}]+$");
    private static final Pattern GENERAL_TEXT_PATTERN = Pattern.compile("^[\\p{L}\\p{N}\\s\\p{P}\\p{S}]+$");
    private static final Pattern ICON_PATTERN = Pattern.compile("^[a-zA-Z0-9_]+$");
    private static final Pattern COLOR_PATTERN = Pattern.compile("^#[0-9a-fA-F]{6}$");

    private final Messages messages;

    public RegexValidator(Messages messages) {
        this.messages = messages;
    }

    public String sanitize(String value) {
        if (value == null) return null;
        // Replace non-breaking spaces (like U+00A0 and U+202F) and trim
        return value.replace('\u00A0', ' ').replace('\u202F', ' ').trim();
    }

    public void validateOnlyLetters(String value, int maxLength) throws BusinessException {
        if (value == null || value.isBlank()) return;
        if (value.length() > maxLength) {
            throw messages.reject(MsgKey.VALIDATION_MAX_LENGTH, maxLength);
        }
        if (!ONLY_LETTERS_PATTERN.matcher(value).matches()) {
            throw messages.reject(MsgKey.VALIDATION_ONLY_LETTERS_INVALID_CHARS);
        }
    }

    public void validateOnlyNumbers(String value, int maxLength) throws BusinessException {
        if (value == null || value.isEmpty()) return;
        if (value.length() > maxLength) {
            throw messages.reject(MsgKey.VALIDATION_MAX_LENGTH, maxLength);
        }
        if (!ONLY_NUMBERS_PATTERN.matcher(value).matches()) {
            throw messages.reject(MsgKey.VALIDATION_ONLY_NUMBERS_INVALID_CHARS);
        }
    }

    public void validateText(String value, int maxLength) throws BusinessException {
        if (value == null || value.isBlank()) return;
        if (value.length() > maxLength) {
            throw messages.reject(MsgKey.VALIDATION_MAX_LENGTH, maxLength);
        }
        if (!GENERAL_TEXT_PATTERN.matcher(value).matches()) {
            throw messages.reject(MsgKey.VALIDATION_LETTERS_AND_NUMBERS_INVALID_CHARS);
        }
    }

    /**
     * Validates the standard name + description pair shared by Template, Subscription, and Event entities.
     * Mirrors the shared field builders in frontend/src/lib/validation.ts.
     */
    public void validateNameAndDescription(String name, String description) throws BusinessException {
        validateText(name, SHORT_MAX_LENGTH);
        validateText(description, LONG_MAX_LENGTH);
    }

    public void validateIcon(String value) throws BusinessException {
        if (value == null || value.isEmpty()) return;
        if (value.length() > ICON_MAX_LENGTH) {
            throw messages.reject(MsgKey.VALIDATION_MAX_LENGTH, ICON_MAX_LENGTH);
        }
        if (!ICON_PATTERN.matcher(value).matches()) {
            throw messages.reject(MsgKey.VALIDATION_ICON_INVALID_CHARS);
        }
    }

    public void validateColor(String value) throws BusinessException {
        if (value == null || value.isEmpty()) return;
        if (value.length() > COLOR_MAX_LENGTH) {
            throw messages.reject(MsgKey.VALIDATION_MAX_LENGTH, COLOR_MAX_LENGTH);
        }
        if (!COLOR_PATTERN.matcher(value).matches()) {
            throw messages.reject(MsgKey.VALIDATION_COLOR_INVALID_CHARS);
        }
    }
}
