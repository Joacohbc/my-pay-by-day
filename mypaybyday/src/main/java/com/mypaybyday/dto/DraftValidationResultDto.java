package com.mypaybyday.dto;

import java.util.List;

/**
 * Outcome of a dry-run draft validation — nothing is persisted regardless of the result.
 *
 * @param valid  true when no validation errors were found
 * @param errors every rule violation found, empty when {@code valid} is true
 */
public record DraftValidationResultDto(boolean valid, List<ValidationErrorDto> errors) {}
