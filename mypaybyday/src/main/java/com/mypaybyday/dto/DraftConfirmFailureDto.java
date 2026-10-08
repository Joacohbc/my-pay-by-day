package com.mypaybyday.dto;

import java.util.List;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * A draft that kept a batch confirmation from going through.
 *
 * @param draftId   the draft that failed
 * @param draftName its name, or {@code null} when that is what is missing
 * @param errors    every rule it breaks
 */
public record DraftConfirmFailureDto(
	@Schema(required = true) Long draftId,
	@Schema(nullable = true) String draftName,
	@Schema(required = true) List<ValidationErrorDto> errors
) {}
