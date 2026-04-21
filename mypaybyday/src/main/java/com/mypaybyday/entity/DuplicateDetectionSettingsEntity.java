package com.mypaybyday.entity;

import jakarta.persistence.Entity;
import jakarta.validation.constraints.NotNull;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity(name = "DuplicateDetectionSettings")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DuplicateDetectionSettingsEntity extends BaseEntity {

	/**
	 * Represents the maximum temporal range considered for linking two events as potential duplicates.
	 */
	@Builder.Default
	@NotNull
	public Integer eventTimeThresholdMinutes = 60;

	/**
	 * Represents the influence of the chronological distance in the total calculated score for Events.
	 */
	@Builder.Default
	@NotNull
	public Double eventDateWeight = 0.6;

	/**
	 * Represents the influence of numeric values (money spent/received) in the total calculated score for Events.
	 */
	@Builder.Default
	@NotNull
	public Double eventAmountWeight = 0.3;

	/**
	 * Represents the influence of identical intersecting destination/origin locations in the total calculated score for Events.
	 */
	@Builder.Default
	@NotNull
	public Double eventNodeWeight = 0.02;

	/**
	 * Represents the influence of an identical category assignation in the total calculated score for Events.
	 */
	@Builder.Default
	@NotNull
	public Double eventCategoryWeight = 0.02;

	/**
	 * Represents the influence of identical intersecting tags in the total calculated score for Events.
	 */
	@Builder.Default
	@NotNull
	public Double eventTagWeight = 0.02;

	/**
	 * Represents the influence of structural sequence matching for event names in the total calculated score for Events.
	 */
	@Builder.Default
	@NotNull
	public Double eventNameWeight = 0.04;

	/**
	 * Value threshold that the combined weights must exceed to consider any two events potential duplicates.
	 */
	@Builder.Default
	@NotNull
	public Double eventTotalThresholdScore = 0.8;

	/**
	 * Standard structural sequence matching bound. Evaluates similarities for shorter single-valued text inputs 
	 * across the entire application domain (e.g., Tags, Categories, and Event Names).
	 */
	@Builder.Default
	@NotNull
	public Double textSimilarityThresholdScore = 0.85;

}
