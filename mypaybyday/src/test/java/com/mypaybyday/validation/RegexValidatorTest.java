package com.mypaybyday.validation;

import jakarta.inject.Inject;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import com.mypaybyday.exception.BusinessException;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

@QuarkusTest
class RegexValidatorTest {

    @Inject
    RegexValidator regexValidator;

    @Test
    void testValidateText_AllowedChars() {
        assertDoesNotThrow(() -> regexValidator.validateText("Name with (parentheses)", 255));
        assertDoesNotThrow(() -> regexValidator.validateText("Name / with / slashes", 255));
        assertDoesNotThrow(() -> regexValidator.validateText("Name, with, commas", 255));
        assertDoesNotThrow(() -> regexValidator.validateText("Name \"with\" quotes", 255));
        assertDoesNotThrow(() -> regexValidator.validateText("Name 'with' single quotes", 255));
    }

    @Test
    void testValidateText_AllowedSpecialChars() {
        assertDoesNotThrow(() -> regexValidator.validateText("Name @ symbol", 255));
        assertDoesNotThrow(() -> regexValidator.validateText("Name # symbol", 255));
        assertDoesNotThrow(() -> regexValidator.validateText("Cost is $100 & more!", 255));
        assertDoesNotThrow(() -> regexValidator.validateText("50% off [sale]", 255));
    }

    @Test
    void testValidateColor_ValidHex() {
        assertDoesNotThrow(() -> regexValidator.validateColor("#D0BCFF"));
        assertDoesNotThrow(() -> regexValidator.validateColor("#000000"));
        assertDoesNotThrow(() -> regexValidator.validateColor("#ffffff"));
    }

    @Test
    void testValidateColor_EmptyOrNullIsAllowed() {
        assertDoesNotThrow(() -> regexValidator.validateColor(null));
        assertDoesNotThrow(() -> regexValidator.validateColor(""));
    }

    @Test
    void testValidateColor_InvalidHexThrows() {
        assertThrows(BusinessException.class, () -> regexValidator.validateColor("red"));
        assertThrows(BusinessException.class, () -> regexValidator.validateColor("#FFF"));
        assertThrows(BusinessException.class, () -> regexValidator.validateColor("D0BCFF"));
        assertThrows(BusinessException.class, () -> regexValidator.validateColor("#GGGGGG"));
    }
}
