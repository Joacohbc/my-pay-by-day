package com.mypaybyday.resource;

import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import com.mypaybyday.dto.DuplicateDetectionSettingsDto;
import com.mypaybyday.entity.DuplicateDetectionSettingsEntity;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.DuplicateDetectionSettingsRepository;
import com.mypaybyday.service.duplicate.DuplicateDetectionService;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.jboss.resteasy.reactive.RestResponse;

@Path("/settings/duplicates")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Duplicate Settings", description = "Settings for duplicate detection")
public class DuplicateSettingsResource {

	@Inject
	DuplicateDetectionSettingsRepository settingsRepository;

	@Inject
	DuplicateDetectionService duplicateDetectionService;

	@Inject
	Messages messages;

	@GET
	@Transactional
	@Operation(summary = "Get duplicate detection settings", description = "Returns the current weights and thresholds used to score potential duplicates")
	@APIResponse(responseCode = "200", description = "Settings retrieved successfully")
	public RestResponse<DuplicateDetectionSettingsDto> getSettings() {
		DuplicateDetectionSettingsEntity entity = settingsRepository.getSettings();
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
		return RestResponse.ok(dto);
	}

	@PUT
	@Transactional
	@Operation(summary = "Update duplicate detection settings", description = "Updates only the provided weight/threshold fields; the weights must sum to 1.0")
	@APIResponses({
		@APIResponse(responseCode = "200", description = "Settings updated successfully"),
		@APIResponse(responseCode = "400", description = "Weights do not sum to 1.0")
	})
	public RestResponse<DuplicateDetectionSettingsDto> updateSettings(DuplicateDetectionSettingsDto request) {
		DuplicateDetectionSettingsEntity entity = settingsRepository.getSettings();
		if (request.eventTimeThresholdMinutes != null) entity.eventTimeThresholdMinutes = request.eventTimeThresholdMinutes;
		if (request.eventDateWeight != null) entity.eventDateWeight = request.eventDateWeight;
		if (request.eventAmountWeight != null) entity.eventAmountWeight = request.eventAmountWeight;
		if (request.eventNodeWeight != null) entity.eventNodeWeight = request.eventNodeWeight;
		if (request.eventCategoryWeight != null) entity.eventCategoryWeight = request.eventCategoryWeight;
		if (request.eventTagWeight != null) entity.eventTagWeight = request.eventTagWeight;
		if (request.eventNameWeight != null) entity.eventNameWeight = request.eventNameWeight;
		if (request.eventTotalThresholdScore != null) entity.eventTotalThresholdScore = request.eventTotalThresholdScore;
		if (request.textSimilarityThresholdScore != null) entity.textSimilarityThresholdScore = request.textSimilarityThresholdScore;

		double weightSum = entity.eventDateWeight + entity.eventAmountWeight + entity.eventNodeWeight
				+ entity.eventCategoryWeight + entity.eventTagWeight + entity.eventNameWeight;
		if (Math.abs(weightSum - 1.0) > 0.001) {
			throw messages.reject(MsgKey.DUPLICATE_SETTINGS_WEIGHTS_SUM_INVALID, Math.round(weightSum * 100));
		}

		settingsRepository.persist(entity);
		return RestResponse.ok(request);
	}

	@POST
	@Path("/scan-all")
	@Operation(summary = "Trigger a full duplicate scan", description = "Starts an asynchronous scan for duplicates across all entities")
	@APIResponse(responseCode = "204", description = "Scan started successfully")
	public RestResponse<Void> triggerScanAll() {
		new Thread(() -> {
			duplicateDetectionService.scanAll();
		}).start();
		return RestResponse.noContent();
	}
}
