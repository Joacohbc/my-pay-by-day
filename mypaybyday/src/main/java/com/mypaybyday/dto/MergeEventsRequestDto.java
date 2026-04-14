package com.mypaybyday.dto;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;

public class MergeEventsRequestDto {

	/** IDs of the events to be merged into the base. */
	@NotEmpty
	public List<Long> sourceIds;

	/**
	 * IDs of the FinanceNodes whose line items should be aggregated (summed) across
	 * all merged events. Line items for nodes NOT in this list are kept as individual
	 * entries — one per original line item.
	 */
	public List<Long> groupByNodeIds;
}
