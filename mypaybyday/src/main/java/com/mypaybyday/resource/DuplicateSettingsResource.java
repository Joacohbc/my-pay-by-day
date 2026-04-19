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
import jakarta.ws.rs.core.Response;

import com.mypaybyday.dto.DuplicateDetectionSettingsDto;
import com.mypaybyday.entity.DuplicateDetectionSettingsEntity;
import com.mypaybyday.repository.DuplicateDetectionSettingsRepository;
import com.mypaybyday.service.DuplicateDetectionService;

import org.eclipse.microprofile.openapi.annotations.tags.Tag;

@Path("/api/settings/duplicates")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Duplicate Settings", description = "Settings for duplicate detection")
public class DuplicateSettingsResource {

	@Inject
	DuplicateDetectionSettingsRepository settingsRepository;

	@Inject
	DuplicateDetectionService duplicateDetectionService;

	@GET
	public Response getSettings() {
		DuplicateDetectionSettingsEntity entity = settingsRepository.getSettings();
		DuplicateDetectionSettingsDto dto = new DuplicateDetectionSettingsDto();
		dto.id = entity.id;
		dto.eventTimeThresholdMinutes = entity.eventTimeThresholdMinutes;
		dto.eventAmountWeight = entity.eventAmountWeight;
		dto.eventNodeWeight = entity.eventNodeWeight;
		dto.eventCategoryWeight = entity.eventCategoryWeight;
		dto.eventTagWeight = entity.eventTagWeight;
		dto.eventNameWeight = entity.eventNameWeight;
		dto.eventTotalThresholdScore = entity.eventTotalThresholdScore;
		dto.textSimilarityThresholdScore = entity.textSimilarityThresholdScore;
		return Response.ok(dto).build();
	}

	@PUT
	@Transactional
	public Response updateSettings(DuplicateDetectionSettingsDto request) {
		DuplicateDetectionSettingsEntity entity = settingsRepository.getSettings();
		if (request.eventTimeThresholdMinutes != null) entity.eventTimeThresholdMinutes = request.eventTimeThresholdMinutes;
		if (request.eventAmountWeight != null) entity.eventAmountWeight = request.eventAmountWeight;
		if (request.eventNodeWeight != null) entity.eventNodeWeight = request.eventNodeWeight;
		if (request.eventCategoryWeight != null) entity.eventCategoryWeight = request.eventCategoryWeight;
		if (request.eventTagWeight != null) entity.eventTagWeight = request.eventTagWeight;
		if (request.eventNameWeight != null) entity.eventNameWeight = request.eventNameWeight;
		if (request.eventTotalThresholdScore != null) entity.eventTotalThresholdScore = request.eventTotalThresholdScore;
		if (request.textSimilarityThresholdScore != null) entity.textSimilarityThresholdScore = request.textSimilarityThresholdScore;
		settingsRepository.persist(entity);
		return Response.ok(request).build();
	}

	@POST
	@Path("/scan-all")
	public Response triggerScanAll() {
		new Thread(() -> {
			duplicateDetectionService.scanAll();
		}).start();
		return Response.accepted().build();
	}
}
