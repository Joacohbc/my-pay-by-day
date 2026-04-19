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

	@Builder.Default
	@NotNull
	public Integer eventTimeThresholdMinutes = 60;

	@Builder.Default
	@NotNull
	public Double eventAmountWeight = 0.3;

	@Builder.Default
	@NotNull
	public Double eventNodeWeight = 0.3;

	@Builder.Default
	@NotNull
	public Double eventCategoryWeight = 0.1;

	@Builder.Default
	@NotNull
	public Double eventTagWeight = 0.1;

	@Builder.Default
	@NotNull
	public Double eventNameWeight = 0.2;

	@Builder.Default
	@NotNull
	public Double eventTotalThresholdScore = 0.8;

	@Builder.Default
	@NotNull
	public Double textSimilarityThresholdScore = 0.85;

}
