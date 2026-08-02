package com.mypaybyday.resource;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import com.mypaybyday.dto.DuplicateDetectionSettingsDto;
import com.mypaybyday.dto.ErrorResponseDto;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.duplicate.DuplicateDetectionSettingsService;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.jboss.resteasy.reactive.RestResponse;

@Path("/settings/duplicates")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Duplicate Settings", description = "Settings for duplicate detection")
public class DuplicateSettingsResource {

	private final DuplicateDetectionSettingsService duplicateDetectionSettingsService;

	public DuplicateSettingsResource(DuplicateDetectionSettingsService duplicateDetectionSettingsService) {
		this.duplicateDetectionSettingsService = duplicateDetectionSettingsService;
	}

	@GET
	@Operation(summary = "Get duplicate detection settings", description = "Returns the current weights and thresholds used to score potential duplicates")
	@APIResponse(responseCode = "200", description = "Settings retrieved successfully",
			content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = DuplicateDetectionSettingsDto.class)))
	public RestResponse<DuplicateDetectionSettingsDto> getSettings() {
		return RestResponse.ok(duplicateDetectionSettingsService.findSettings());
	}

	@PUT
	@Operation(summary = "Update duplicate detection settings", description = "Updates only the provided weight/threshold fields; the weights must sum to 1.0")
	@APIResponses({
		@APIResponse(responseCode = "200", description = "Settings updated successfully",
				content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = DuplicateDetectionSettingsDto.class))),
		@APIResponse(responseCode = "400", description = "Weights do not sum to 1.0",
				content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
	})
	public RestResponse<DuplicateDetectionSettingsDto> updateSettings(DuplicateDetectionSettingsDto request)
			throws BusinessException {
		return RestResponse.ok(duplicateDetectionSettingsService.update(request));
	}

	@POST
	@Path("/scan-all")
	@Operation(summary = "Trigger a full duplicate scan", description = "Starts an asynchronous scan for duplicates across all entities")
	@APIResponse(responseCode = "204", description = "Scan started successfully")
	public RestResponse<Void> triggerScanAll() {
		duplicateDetectionSettingsService.startFullScan();
		return RestResponse.noContent();
	}
}
