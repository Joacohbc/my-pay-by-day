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

	/**
	 * ID of the category to assign to the base event after the merge.
	 * If null, the base event's existing category is preserved.
	 */
	public Long categoryId;

	/**
	 * IDs of the tags to assign to the base event after the merge.
	 * If null, the base event's existing tags are preserved.
	 */
	public List<Long> tagIds;

	/**
	 * New name for the base event after the merge.
	 * If null or blank, the base event's existing name is preserved.
	 */
	public String name;

	/**
	 * New description for the base event after the merge.
	 * If null or blank, the base event's existing description is preserved.
	 */
	public String description;
}
