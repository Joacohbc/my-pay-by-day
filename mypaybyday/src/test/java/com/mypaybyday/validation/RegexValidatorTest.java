package com.mypaybyday.validation;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import jakarta.inject.Inject;

import com.mypaybyday.exception.BusinessException;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

@QuarkusTest
class RegexValidatorTest {

    @Inject
    RegexValidator regexValidator;

    @Test
    void testValidateLettersAndNumbers_NewAllowedChars() {
        assertDoesNotThrow(() -> regexValidator.validateLettersAndNumbers("Name with (parentheses)", 255));
        assertDoesNotThrow(() -> regexValidator.validateLettersAndNumbers("Name / with / slashes", 255));
        assertDoesNotThrow(() -> regexValidator.validateLettersAndNumbers("Name, with, commas", 255));
        assertDoesNotThrow(() -> regexValidator.validateLettersAndNumbers("Name \"with\" quotes", 255));
        assertDoesNotThrow(() -> regexValidator.validateLettersAndNumbers("Name 'with' single quotes", 255));
    }

    @Test
    void testValidateLettersAndNumbers_InvalidChars() {
        assertThrows(BusinessException.class, () -> regexValidator.validateLettersAndNumbers("Name with @ symbol", 255));
        assertThrows(BusinessException.class, () -> regexValidator.validateLettersAndNumbers("Name with # symbol", 255));
    }
}
