package com.mypaybyday.dto;

/**
 * A single rule violation found while dry-run validating a draft or a merge.
 *
 * @param field   which part failed — one of the {@code *_FIELD} constants
 * @param message localized, human-readable description of the failure
 */
public record ValidationErrorDto(String field, String message) {

	public static final String NAME_FIELD = "name";
	public static final String TYPE_FIELD = "type";
	public static final String SOURCES_FIELD = "sources";
	public static final String DATE_FIELD = "transactionDate";
	public static final String LINE_ITEMS_FIELD = "lineItems";
	public static final String ZERO_SUM_FIELD = "lineItems.zeroSum";
	public static final String NODES_FIELD = "lineItems.nodes";
	public static final String CURRENCY_FIELD = "lineItems.currency";
}
