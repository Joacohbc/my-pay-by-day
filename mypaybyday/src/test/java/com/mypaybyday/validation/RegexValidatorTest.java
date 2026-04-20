package com.mypaybyday.validation;

import jakarta.inject.Inject;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

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
}
