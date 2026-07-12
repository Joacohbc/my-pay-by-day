package com.mypaybyday.dto;

import java.util.List;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * Outcome of a batch draft confirmation. Drafts that fail validation (missing name, date, or
 * line items) are skipped and reported in {@code failedDraftIds} rather than aborting the
 * whole batch.
 *
 * @param confirmedEvents events created or updated from successfully confirmed drafts
 * @param failedDraftIds  IDs of drafts that could not be confirmed
 */
public record ConfirmDraftsResultDto(
	@Schema(required = true) List<FinanceEventDto> confirmedEvents,
	@Schema(required = true) List<Long> failedDraftIds
) {}
