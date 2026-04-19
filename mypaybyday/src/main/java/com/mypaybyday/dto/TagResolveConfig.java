package com.mypaybyday.dto;

import java.util.Set;

/**
 * Configuration for resolving tags from DTOs to entities.
 *
 * @param strategy the strategy to apply regarding archived tags
 * @param existingTagIds the IDs of tags already associated with the entity (relevant for ALLOW_ONLY_EXISTING_ARCHIVED)
 */
public record TagResolveConfig(
		Strategy strategy,
		Set<Long> existingTagIds
) {

	public enum Strategy {
		/**
		 * Any archived tag is allowed.
		 */
		ALLOW_ALL_ARCHIVED,

		/**
		 * Archived tags are allowed ONLY if their ID is present in the existingTagIds set.
		 * This is the common use case for updates: you can keep an old archived tag that was already there,
		 * but you cannot add a NEW archived tag.
		 */
		ALLOW_ONLY_EXISTING_ARCHIVED,

		/**
		 * No archived tags are allowed at all.
		 */
		NOT_ALLOW_ARCHIVED
	}

	/**
	 * Convenience factory for standard "new entity" resolution (no archived allowed).
	 */
	public static TagResolveConfig forNewEntity() {
		return new TagResolveConfig(Strategy.NOT_ALLOW_ARCHIVED, Set.of());
	}

	/**
	 * Convenience factory for "update entity" resolution (allow existing archived).
	 */
	public static TagResolveConfig forUpdate(Set<Long> existingTagIds) {
		return new TagResolveConfig(Strategy.ALLOW_ONLY_EXISTING_ARCHIVED, existingTagIds != null ? existingTagIds : Set.of());
	}
}
