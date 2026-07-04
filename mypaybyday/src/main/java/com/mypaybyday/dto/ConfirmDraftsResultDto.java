package com.mypaybyday.dto;

import java.util.List;

/**
 * Outcome of a batch draft confirmation. Drafts that fail validation (missing name, date, or
 * line items) are skipped and reported in {@code failedDraftIds} rather than aborting the
 * whole batch.
 *
 * @param confirmedEvents events created or updated from successfully confirmed drafts
 * @param failedDraftIds  IDs of drafts that could not be confirmed
 */
public record ConfirmDraftsResultDto(
	List<FinanceEventDto> confirmedEvents,
	List<Long> failedDraftIds
) {}
