package com.mypaybyday.i18n;

/**
 * Type-safe enumeration of every i18n message key used in the application.
 * <p>
 * Each constant maps to a property key in
 * {@code i18n/messages_<lang>.properties}.
 * Pass these constants to {@link Messages#get(MsgKey, Object...)} instead of
 * raw
 * strings so that typos are caught at compile time.
 */
public enum MsgKey {

	// ── CategoryEntity ─────────────────────────────────────────
	CATEGORY_NOT_FOUND("error.category.not_found"),
	CATEGORY_NOT_FOUND_ARCHIVED("error.category.not_found_archived"),
	CATEGORY_NAME_REQUIRED("error.category.name_required"),
	CATEGORY_IN_USE("error.category.in_use"),
	CATEGORY_ARCHIVE_IN_USE("error.category.archive_in_use"),

	// ── TagEntity ──────────────────────────────────────────────
	TAG_NOT_FOUND("error.tag.not_found"),
	TAG_NOT_FOUND_ARCHIVED("error.tag.not_found_archived"),
	TAG_NAME_REQUIRED("error.tag.name_required"),
	TAG_IN_USE("error.tag.in_use"),
	TAG_ARCHIVE_IN_USE("error.tag.archive_in_use"),

	// ── TagGroupEntity ─────────────────────────────────────────
	TAG_GROUP_NOT_FOUND("error.tag_group.not_found"),
	TAG_GROUP_NOT_FOUND_ARCHIVED("error.tag_group.not_found_archived"),
	TAG_GROUP_NAME_REQUIRED("error.tag_group.name_required"),
	TAG_GROUP_MIN_TAGS("error.tag_group.min_tags"),

	// ── Event ─────────────────────────────────────────────
	EVENT_NOT_FOUND("error.event.not_found"),
	EVENT_TRANSACTION_REQUIRED("error.event.transaction_required"),
	EVENT_CATEGORY_ID_REQUIRED("error.event.category_id_required"),
	EVENT_TAGS_ID_REQUIRED("error.event.tags_id_required"),
	EVENT_DATE_RANGE_NULL("error.event.date_range_null"),
	EVENT_DATE_RANGE_INVALID("error.event.date_range_invalid"),
	EVENT_RELATED_NOT_FOUND("error.event.related_not_found"),
	EVENT_MERGE_SELF("error.event.merge_self"),
	EVENT_MERGE_MIXED_TYPES("error.event.merge_mixed_types"),
	EVENT_MERGE_NO_SOURCES("error.event.merge_no_sources"),

	// ── Finance Node ──────────────────────────────────────
	NODE_NOT_FOUND("error.node.not_found"),
	NODE_NOT_FOUND_ARCHIVED("error.node.not_found_archived"),
	NODE_NOT_FOUND_ARCHIVED_GENERIC("error.node.not_found_archived_generic"),
	NODE_HAS_TRANSACTIONS("error.node.has_transactions"),
	NODE_ARCHIVED_IN_USE("error.node.archived_in_use"),
	NODE_ARCHIVE_IN_USE("error.node.archive_in_use"),

	// ── TemplateEntity ──────────────────────────────────────────
	TEMPLATE_NOT_FOUND("error.template.not_found"),
	TEMPLATE_NAME_REQUIRED("error.template.name_required"),
	TEMPLATE_MODIFIER_VALIDATION("error.template.modifier_validation"),

	// ── Time Period ───────────────────────────────────────
	TIME_PERIOD_NOT_FOUND("error.time_period.not_found"),
	TIME_PERIOD_NAME_REQUIRED("error.time_period.name_required"),
	TIME_PERIOD_START_DATE_REQUIRED("error.time_period.start_date_required"),
	TIME_PERIOD_END_DATE_REQUIRED("error.time_period.end_date_required"),
	TIME_PERIOD_BUDGET_LIMIT_MINIMUM("error.time_period.budget_limit_minimum"),

	// ── Transaction ───────────────────────────────────────
	TRANSACTION_NOT_FOUND("error.transaction.not_found"),
	TRANSACTION_NO_LINE_ITEMS("error.transaction.no_line_items"),
	TRANSACTION_LINE_ITEM_AMOUNT_NULL("error.transaction.line_item_amount_null"),
	TRANSACTION_ZERO_SUM_VIOLATED("error.transaction.zero_sum_violated"),
	TRANSACTION_LINE_ITEM_NODES_NOT_FOUND("error.transaction.line_item_nodes_not_found"),

	// ── SubscriptionEntity ─────────────────────────────────────
	SUBSCRIPTION_NOT_FOUND("error.subscription.not_found"),
	SUBSCRIPTION_NAME_REQUIRED("error.subscription.name_required"),
	SUBSCRIPTION_NEXT_EXECUTION_DATE_REQUIRED("error.subscription.next_execution_date_required"),
	SUBSCRIPTION_RECURRENCE_REQUIRED("error.subscription.recurrence_required"),
	SUBSCRIPTION_PROCESSING_FAILED("error.subscription.processing_failed"),

	// ── Event Draft ──────────────────────────────────────
	DRAFT_NOT_FOUND("error.draft.not_found"),
	DRAFT_INVALID_PAYLOAD("error.draft.invalid_payload"),

	// ── Intelligent Event ────────────────────────────────
	INTELLIGENT_EVENT_DRAFT_CREATION_FAILED("error.intelligent_event.draft_creation_failed"),

	// ── AI Text Generation ───────────────────────────────
	AI_TEXT_GENERATION_FAILED("error.ai_text.generation_failed"),

	// ── Validation ───────────────────────────────────────
	VALIDATION_ONLY_LETTERS_INVALID_CHARS("error.validation.only_letters_invalid_chars"),
	VALIDATION_ONLY_NUMBERS_INVALID_CHARS("error.validation.only_numbers_invalid_chars"),
	VALIDATION_LETTERS_AND_NUMBERS_INVALID_CHARS("error.validation.letters_and_numbers_invalid_chars"),
	VALIDATION_ICON_INVALID_CHARS("error.validation.icon_invalid_chars"),
	VALIDATION_MAX_LENGTH("error.validation.max_length"),
	VALIDATION_DATE_RANGE_INVALID("error.validation.date_range_invalid"),
	VALIDATION_DATE_IN_FUTURE("error.validation.date_in_future"),
	VALIDATION_DATE_IN_PAST("error.validation.date_in_past"),
	VALIDATION_NUMBER_POSITIVE("error.validation.number_positive"),
	VALIDATION_NUMBER_NON_NEGATIVE("error.validation.number_non_negative"),
	VALIDATION_NUMBER_RANGE("error.validation.number_range"),

	// ── Selection History ────────────────────────────────
	SELECTION_HISTORY_ENTITY_TYPE_REQUIRED("error.selection_history.entity_type_required"),
	SELECTION_HISTORY_ENTITY_ID_REQUIRED("error.selection_history.entity_id_required");


	/** The property key used to look up this message in the resource bundle. */
	public final String key;

	MsgKey(String key) {
		this.key = key;
	}
}
