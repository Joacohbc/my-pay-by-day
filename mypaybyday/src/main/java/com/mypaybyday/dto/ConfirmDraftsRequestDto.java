package com.mypaybyday.dto;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import com.mypaybyday.enums.DraftConfirmMode;

public class ConfirmDraftsRequestDto {

	/** IDs of the drafts to confirm. */
	@NotEmpty
	public List<Long> draftIds;

	/**
	 * MERGE updates the linked event when a draft has one, or creates a new event otherwise.
	 * CREATE_ONLY always creates a new event, ignoring any existing link.
	 */
	@NotNull
	public DraftConfirmMode mode;
}
