package com.mypaybyday.dto;

public class DuplicateDetectionSettingsDto {
	public Long id;
	public Integer eventTimeThresholdMinutes;
	public Double eventAmountWeight;
	public Double eventNodeWeight;
	public Double eventCategoryWeight;
	public Double eventTagWeight;
	public Double eventNameWeight;
	public Double eventTotalThresholdScore;
	public Double textSimilarityThresholdScore;
}
