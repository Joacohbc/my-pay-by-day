package com.mypaybyday.dto;

import com.mypaybyday.entity.DuplicateDetectionSettingsEntity;

public class DuplicateDetectionSettingsDto {
	public Long id;
	public Integer eventTimeThresholdMinutes;
	public Double eventDateWeight;
	public Double eventAmountWeight;
	public Double eventNodeWeight;
	public Double eventCategoryWeight;
	public Double eventTagWeight;
	public Double eventNameWeight;
	public Double eventTotalThresholdScore;
	public Double textSimilarityThresholdScore;

	public static DuplicateDetectionSettingsDto from(DuplicateDetectionSettingsEntity entity) {
		DuplicateDetectionSettingsDto dto = new DuplicateDetectionSettingsDto();
		dto.id = entity.id;
		dto.eventTimeThresholdMinutes = entity.eventTimeThresholdMinutes;
		dto.eventDateWeight = entity.eventDateWeight;
		dto.eventAmountWeight = entity.eventAmountWeight;
		dto.eventNodeWeight = entity.eventNodeWeight;
		dto.eventCategoryWeight = entity.eventCategoryWeight;
		dto.eventTagWeight = entity.eventTagWeight;
		dto.eventNameWeight = entity.eventNameWeight;
		dto.eventTotalThresholdScore = entity.eventTotalThresholdScore;
		dto.textSimilarityThresholdScore = entity.textSimilarityThresholdScore;
		return dto;
	}
}
