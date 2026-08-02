package com.mypaybyday.i18n;

import com.mypaybyday.enums.ErrorKind;

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
	EVENT_BULK_NO_IDS("error.event.bulk_no_ids"),
	EVENT_BULK_EVENTS_NOT_FOUND("error.event.bulk_events_not_found"),

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

	// ── PaymentPlanEntity ──────────────────────────────────────
	PAYMENT_PLAN_NOT_FOUND("error.payment_plan.not_found"),
	PAYMENT_PLAN_NAME_REQUIRED("error.payment_plan.name_required"),
	PAYMENT_PLAN_START_DATE_REQUIRED("error.payment_plan.start_date_required"),
	PAYMENT_PLAN_FREQUENCY_REQUIRED("error.payment_plan.frequency_required"),
	PAYMENT_PLAN_FREQUENCY_NOT_SCHEDULABLE("error.payment_plan.frequency_not_schedulable"),
	PAYMENT_PLAN_TOTAL_INSTALLMENTS_REQUIRED("error.payment_plan.total_installments_required"),
	PAYMENT_PLAN_END_DATE_REQUIRED("error.payment_plan.end_date_required"),
	PAYMENT_PLAN_END_DATE_BEFORE_START("error.payment_plan.end_date_before_start"),
	PAYMENT_PLAN_TEMPLATE_REQUIRED_FOR_AUTOMATION("error.payment_plan.template_required_for_automation"),
	PAYMENT_PLAN_TEMPLATE_NODES_REQUIRED("error.payment_plan.template_nodes_required"),
	PAYMENT_PLAN_AMOUNT_REQUIRED_FOR_AUTOMATION("error.payment_plan.amount_required_for_automation"),
	PAYMENT_PLAN_AUTOMATION_NOT_SUPPORTED("error.payment_plan.automation_not_supported"),
	PAYMENT_PLAN_TEMPLATE_NOT_FOUND("error.payment_plan.template_not_found"),
	PAYMENT_PLAN_NOT_CANCELLED_FOR_DELETE("error.payment_plan.not_cancelled_for_delete"),
	PAYMENT_PLAN_STATUS_NOT_ALLOWED_FOR_TYPE("error.payment_plan.status_not_allowed_for_type"),

	// ── PaymentPlanItemEntity ──────────────────────────────────
	PAYMENT_PLAN_ITEM_NOT_FOUND("error.payment_plan_item.not_found"),
	PAYMENT_PLAN_ITEM_EXPECTED_DATE_REQUIRED("error.payment_plan_item.expected_date_required"),
	PAYMENT_PLAN_ITEM_NUMBER_INVALID("error.payment_plan_item.number_invalid"),
	PAYMENT_PLAN_ITEM_NUMBER_DUPLICATED("error.payment_plan_item.number_duplicated"),
	PAYMENT_PLAN_ITEM_LINK_NOT_EXCLUSIVE("error.payment_plan_item.link_not_exclusive"),
	PAYMENT_PLAN_ITEM_BEFORE_PLAN_START("error.payment_plan_item.before_plan_start"),
	PAYMENT_PLAN_ITEM_AFTER_PLAN_END("error.payment_plan_item.after_plan_end"),
	PAYMENT_PLAN_ITEM_LIMIT_REACHED("error.payment_plan_item.limit_reached"),

	// ── Event Draft ──────────────────────────────────────
	DRAFT_NOT_FOUND("error.draft.not_found"),
	DRAFT_INVALID_PAYLOAD("error.draft.invalid_payload"),
	DRAFT_EVENT_ID_REQUIRED("error.draft.event_id_required"),
	DRAFT_MISSING_NAME("error.draft.missing_name"),
	DRAFT_MISSING_DATE("error.draft.missing_date"),
	DRAFT_MISSING_LINE_ITEMS("error.draft.missing_line_items"),
	DRAFT_CONFIRM_NO_IDS("error.draft.confirm_no_ids"),

	// ── File ─────────────────────────────────────────────
	FILE_CONTENT_EMPTY("file.content.empty"),
	FILE_CONTENT_INVALID_BASE64("file.content.invalid.base64"),
	FILE_SIZE_EXCEEDED("file.size.exceeded"),
	FILE_NOT_FOUND("file.not.found"),
	FILE_IN_USE("file.in.use"),

	// ── Validation ───────────────────────────────────────
	VALIDATION_ONLY_LETTERS_INVALID_CHARS("error.validation.only_letters_invalid_chars"),
	VALIDATION_ONLY_NUMBERS_INVALID_CHARS("error.validation.only_numbers_invalid_chars"),
	VALIDATION_LETTERS_AND_NUMBERS_INVALID_CHARS("error.validation.letters_and_numbers_invalid_chars"),
	VALIDATION_ICON_INVALID_CHARS("error.validation.icon_invalid_chars"),
	VALIDATION_COLOR_INVALID_CHARS("error.validation.color_invalid_chars"),
	VALIDATION_MAX_LENGTH("error.validation.max_length"),
	VALIDATION_DATE_RANGE_INVALID("error.validation.date_range_invalid"),
	VALIDATION_DATE_IN_FUTURE("error.validation.date_in_future"),
	VALIDATION_DATE_IN_PAST("error.validation.date_in_past"),
	VALIDATION_NUMBER_POSITIVE("error.validation.number_positive"),
	VALIDATION_NUMBER_NON_NEGATIVE("error.validation.number_non_negative"),
	VALIDATION_NUMBER_RANGE("error.validation.number_range"),

	// ── Selection History ────────────────────────────────
	SELECTION_HISTORY_ENTITY_TYPE_REQUIRED("error.selection_history.entity_type_required"),
	SELECTION_HISTORY_ENTITY_ID_REQUIRED("error.selection_history.entity_id_required"),

	// ── Duplicates ───────────────────────────────────────
	DUPLICATES_TYPE_AND_STATUS_REQUIRED("error.duplicates.type_and_status_required"),

	// ── Duplicate Settings ───────────────────────────────
	DUPLICATE_SETTINGS_WEIGHTS_SUM_INVALID("error.duplicate_settings.weights_sum_invalid"),

	// ── Data Transfer ────────────────────────────────────
	DATA_TRANSFER_ARCHIVE_UNREADABLE("error.data_transfer.archive_unreadable"),
	DATA_TRANSFER_MANIFEST_MISSING("error.data_transfer.manifest_missing"),
	DATA_TRANSFER_VERSION_UNSUPPORTED("error.data_transfer.version_unsupported"),
	DATA_TRANSFER_ITEM_SKIPPED("error.data_transfer.item_skipped"),

	// ── Request ────────────────────────────────────────────────
	REQUEST_NOT_FOUND("error.request.not_found"),
	REQUEST_INVALID("error.request.invalid"),

	// ── Server ─────────────────────────────────────────────────
	INTERNAL_SERVER_ERROR("error.server.internal");


	/** The property key used to look up this message in the resource bundle. */
	public final String key;

	MsgKey(String key) {
		this.key = key;
	}

	/**
	 * Classifies this message into a business-meaningful {@link ErrorKind} by inspecting the constant
	 * name, so a {@code BusinessException} carrying this key can be aggregated by error type in logs
	 * and dashboards without any per-throw-site annotation. Order matters: the first matching rule wins.
	 */
	public ErrorKind errorKind() {
		String name = name();
		if (name.contains("NOT_FOUND")) {
			return ErrorKind.NOT_FOUND;
		}
		if (name.contains("IN_USE")) {
			return ErrorKind.CONFLICT;
		}
		if (name.contains("ZERO_SUM") || name.contains("HAS_TRANSACTIONS")) {
			return ErrorKind.INTEGRITY;
		}
		if (name.contains("EXCEEDED") || name.contains("SIZE")) {
			return ErrorKind.LIMIT;
		}
		if (isValidation(name)) {
			return ErrorKind.VALIDATION;
		}
		return ErrorKind.BUSINESS;
	}

	private static boolean isValidation(String name) {
		return name.startsWith("VALIDATION_")
				|| name.contains("VALIDATION")
				|| name.contains("INVALID")
				|| name.endsWith("_REQUIRED")
				|| name.contains("MISSING")
				|| name.contains("EMPTY")
				|| name.contains("NULL")
				|| name.contains("NO_IDS")
				|| name.contains("NO_LINE_ITEMS")
				|| name.contains("NO_SOURCES")
				|| name.contains("MIN_")
				|| name.contains("MINIMUM")
				|| name.contains("RANGE")
				|| name.contains("POSITIVE")
				|| name.contains("NEGATIVE")
				|| name.contains("MAX_LENGTH")
				|| name.contains("WEIGHTS_SUM")
				|| name.contains("BASE64")
				|| name.contains("DATE_IN_");
	}
}
