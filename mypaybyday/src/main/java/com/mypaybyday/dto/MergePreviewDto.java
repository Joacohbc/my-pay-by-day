package com.mypaybyday.dto;

import java.util.List;
import java.util.stream.Collectors;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * Outcome of a dry-run merge — nothing is persisted regardless of the result.
 *
 * @param valid       true when the merge can be confirmed as it stands
 * @param errors      every rule the merge would break, empty when {@code valid} is true
 * @param mergedEvent the single event the merge would leave behind; its {@code id} is the base
 *                    event's, or {@code null} when merging drafts into a new event
 */
public record MergePreviewDto(
	@Schema(required = true) boolean valid,
	@Schema(required = true) List<ValidationErrorDto> errors,
	@Schema(required = true) FinanceEventDto mergedEvent
) {

	/** Every error message joined into one line, for rejecting a merge confirmed while invalid. */
	public String describeErrors() {
		return errors.stream().map(ValidationErrorDto::message).collect(Collectors.joining("; "));
	}
}
