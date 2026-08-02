package com.mypaybyday.service.duplicate;

import com.mypaybyday.dto.DuplicateDetectionSettingsDto;
import com.mypaybyday.entity.DuplicateDetectionSettingsEntity;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.DuplicateDetectionSettingsRepository;

import io.smallrye.mutiny.infrastructure.Infrastructure;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

@ApplicationScoped
public class DuplicateDetectionSettingsService {

	private static final double WEIGHT_SUM_TOLERANCE = 0.001;
	private static final double REQUIRED_WEIGHT_SUM = 1.0;
	private static final int PERCENT_SCALE = 100;

	private final DuplicateDetectionSettingsRepository settingsRepository;
	private final DuplicateDetectionService duplicateDetectionService;
	private final Messages messages;

	public DuplicateDetectionSettingsService(
			DuplicateDetectionSettingsRepository settingsRepository,
			DuplicateDetectionService duplicateDetectionService,
			Messages messages) {
		this.settingsRepository = settingsRepository;
		this.duplicateDetectionService = duplicateDetectionService;
		this.messages = messages;
	}

	@Transactional
	public DuplicateDetectionSettingsDto findSettings() {
		return DuplicateDetectionSettingsDto.from(settingsRepository.getSettings());
	}

	@Transactional
	public DuplicateDetectionSettingsDto update(DuplicateDetectionSettingsDto patch) throws BusinessException {
		DuplicateDetectionSettingsEntity settings = settingsRepository.getSettings();
		applyPatch(settings, patch);

		double weightSum = totalEventWeight(settings);
		boolean weightsSumToOne = Math.abs(weightSum - REQUIRED_WEIGHT_SUM) <= WEIGHT_SUM_TOLERANCE;
		if (!weightsSumToOne) {
			throw messages.reject(MsgKey.DUPLICATE_SETTINGS_WEIGHTS_SUM_INVALID, Math.round(weightSum * PERCENT_SCALE));
		}

		return DuplicateDetectionSettingsDto.from(settings);
	}

	/**
	 * Scans every entity type off the request thread: a full scan walks the whole ledger and would
	 * otherwise hold the HTTP connection open for as long as it takes.
	 */
	public void startFullScan() {
		Infrastructure.getDefaultWorkerPool().execute(duplicateDetectionService::scanAll);
	}

	private static void applyPatch(DuplicateDetectionSettingsEntity settings, DuplicateDetectionSettingsDto patch) {
		if (patch.eventTimeThresholdMinutes != null) settings.eventTimeThresholdMinutes = patch.eventTimeThresholdMinutes;
		if (patch.eventDateWeight != null) settings.eventDateWeight = patch.eventDateWeight;
		if (patch.eventAmountWeight != null) settings.eventAmountWeight = patch.eventAmountWeight;
		if (patch.eventNodeWeight != null) settings.eventNodeWeight = patch.eventNodeWeight;
		if (patch.eventCategoryWeight != null) settings.eventCategoryWeight = patch.eventCategoryWeight;
		if (patch.eventTagWeight != null) settings.eventTagWeight = patch.eventTagWeight;
		if (patch.eventNameWeight != null) settings.eventNameWeight = patch.eventNameWeight;
		if (patch.eventTotalThresholdScore != null) settings.eventTotalThresholdScore = patch.eventTotalThresholdScore;
		if (patch.textSimilarityThresholdScore != null) settings.textSimilarityThresholdScore = patch.textSimilarityThresholdScore;
	}

	private static double totalEventWeight(DuplicateDetectionSettingsEntity settings) {
		return settings.eventDateWeight + settings.eventAmountWeight + settings.eventNodeWeight
				+ settings.eventCategoryWeight + settings.eventTagWeight + settings.eventNameWeight;
	}
}
