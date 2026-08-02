package com.mypaybyday.enums;

/**
 * One self-contained slice of the user's data in an export archive.
 *
 * <p>
 * Declaration order is the import order: a section may only reference sections declared before it,
 * because an importer resolves foreign keys through the id maps the earlier sections filled in.
 * Drafts sit after events because a draft's {@code originalEntityId} points at the entity it edits.
 * Reordering is safe on disk — the wire key is {@link #name()}, never the ordinal.
 */
public enum DataSection {
	DUPLICATE_DETECTION_SETTINGS,
	TAGS,
	CATEGORIES,
	FINANCE_NODES,
	FILES,
	TAG_GROUPS,
	SUBSCRIPTIONS,
	TEMPLATES,
	TIME_PERIODS,
	EVENTS,
	DRAFTS,
	PAYMENT_PLANS
}
