package com.mypaybyday.i18n;

/**
 * Type-safe enumeration of every i18n message key used in the application.
 * <p>
 * Each constant maps to a property key in {@code i18n/messages_<lang>.properties}.
 * Pass these constants to {@link Messages#get(MsgKey, Object...)} instead of raw
 * strings so that typos are caught at compile time.
 */
public enum MsgKey {

    // ── Category ─────────────────────────────────────────
    CATEGORY_NOT_FOUND("error.category.not_found"),
    CATEGORY_NAME_REQUIRED("error.category.name_required"),

    // ── Tag ──────────────────────────────────────────────
    TAG_NOT_FOUND("error.tag.not_found"),
    TAG_NAME_REQUIRED("error.tag.name_required"),

    // ── Event ─────────────────────────────────────────────
    EVENT_NOT_FOUND("error.event.not_found"),
    EVENT_TRANSACTION_REQUIRED("error.event.transaction_required"),
    EVENT_CATEGORY_ID_REQUIRED("error.event.category_id_required"),
    EVENT_TAGS_ID_REQUIRED("error.event.tags_id_required"),
    EVENT_DATE_RANGE_NULL("error.event.date_range_null"),
    EVENT_DATE_RANGE_INVALID("error.event.date_range_invalid"),

    // ── Finance Node ──────────────────────────────────────
    NODE_NOT_FOUND("error.node.not_found"),
    NODE_NOT_FOUND_ARCHIVED("error.node.not_found_archived"),
    NODE_NOT_FOUND_ARCHIVED_GENERIC("error.node.not_found_archived_generic"),
    NODE_HAS_TRANSACTIONS("error.node.has_transactions"),
    NODE_ARCHIVED_IN_USE("error.node.archived_in_use"),

    // ── Template ──────────────────────────────────────────
    TEMPLATE_NOT_FOUND("error.template.not_found"),
    TEMPLATE_NAME_REQUIRED("error.template.name_required"),
    TEMPLATE_IN_USE("error.template.in_use"),

    // ── Time Period ───────────────────────────────────────
    TIME_PERIOD_NOT_FOUND("error.time_period.not_found"),
    TIME_PERIOD_NAME_REQUIRED("error.time_period.name_required"),
    TIME_PERIOD_START_DATE_REQUIRED("error.time_period.start_date_required"),
    TIME_PERIOD_END_DATE_REQUIRED("error.time_period.end_date_required"),
    TIME_PERIOD_END_BEFORE_START("error.time_period.end_before_start"),
    TIME_PERIOD_SAVINGS_GOAL_RANGE("error.time_period.savings_goal_range"),

    // ── Transaction ───────────────────────────────────────
    TRANSACTION_NOT_FOUND("error.transaction.not_found"),
    TRANSACTION_NO_LINE_ITEMS("error.transaction.no_line_items"),
    TRANSACTION_LINE_ITEM_AMOUNT_NULL("error.transaction.line_item_amount_null"),
    TRANSACTION_ZERO_SUM_VIOLATED("error.transaction.zero_sum_violated"),
    TRANSACTION_LINE_ITEM_NODES_NOT_FOUND("error.transaction.line_item_nodes_not_found"),

    // ── Subscription ─────────────────────────────────────
    SUBSCRIPTION_NOT_FOUND("error.subscription.not_found"),
    SUBSCRIPTION_NAME_REQUIRED("error.subscription.name_required"),
    SUBSCRIPTION_TEMPLATE_REQUIRED("error.subscription.template_required");

    /** The property key used to look up this message in the resource bundle. */
    public final String key;

    MsgKey(String key) {
        this.key = key;
    }
}
