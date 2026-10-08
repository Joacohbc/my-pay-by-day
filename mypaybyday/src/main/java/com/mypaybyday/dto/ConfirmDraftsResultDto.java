package com.mypaybyday.dto;

import java.util.List;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * Outcome of a batch draft confirmation, which is all or nothing: when any draft fails
 * validation, none is confirmed and every failing one is reported.
 *
 * @param confirmedEvents events created or updated, empty when {@code failedDrafts} is not
 * @param failedDrafts    drafts that kept the batch from being confirmed, with their errors
 */
public record ConfirmDraftsResultDto(
	@Schema(required = true) List<FinanceEventDto> confirmedEvents,
	@Schema(required = true) List<DraftConfirmFailureDto> failedDrafts
) {}
