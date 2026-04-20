package com.mypaybyday.dto;

/**
 * Configuration for resolving categories from DTOs to entities.
 *
 * @param strategy the strategy to apply regarding archived categories
 * @param existingCategoryId the ID of the category already associated with the entity (relevant for ALLOW_ONLY_EXISTING_ARCHIVED)
 */
public record CategoryResolveConfig(
		Strategy strategy,
		Long existingCategoryId
) {

	public enum Strategy {
		/**
		 * Any archived category is allowed.
		 */
		ALLOW_ALL_ARCHIVED,

		/**
		 * Archived category is allowed ONLY if its ID matches the existingCategoryId.
		 * This is the common use case for updates: you can keep an old archived category that was already there,
		 * but you cannot change to a different archived category.
		 */
		ALLOW_ONLY_EXISTING_ARCHIVED,

		/**
		 * No archived categories are allowed at all.
		 */
		NOT_ALLOW_ARCHIVED
	}

	/**
	 * Convenience factory for standard "new entity" resolution (no archived allowed).
	 */
	public static CategoryResolveConfig forNewEntity() {
		return new CategoryResolveConfig(Strategy.NOT_ALLOW_ARCHIVED, null);
	}

	/**
	 * Convenience factory for "update entity" resolution (allow existing archived).
	 */
	public static CategoryResolveConfig forUpdate(Long existingCategoryId) {
		return new CategoryResolveConfig(Strategy.ALLOW_ONLY_EXISTING_ARCHIVED, existingCategoryId);
	}
}
