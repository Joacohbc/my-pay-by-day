package com.mypaybyday.resource;

import java.util.List;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;

import com.mypaybyday.dto.DuplicateRecordDto;
import com.mypaybyday.dto.ErrorResponseDto;
import com.mypaybyday.dto.ResolveDuplicateRequestDto;
import com.mypaybyday.enums.DuplicateRecordStatus;
import com.mypaybyday.enums.EntityType;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.duplicate.DuplicateDetectionService;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.jboss.resteasy.reactive.RestResponse;

@Path("/duplicates")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Duplicates", description = "Duplicate Detection Management")
public class DuplicateResource {

	private final DuplicateDetectionService duplicateDetectionService;

	public DuplicateResource(DuplicateDetectionService duplicateDetectionService) {
		this.duplicateDetectionService = duplicateDetectionService;
	}

	@GET
	@Operation(summary = "List duplicates by type and status", description = "Returns the duplicate records detected for an entity type, filtered by resolution status")
	@APIResponses({
		@APIResponse(responseCode = "200", description = "Duplicates found"),
		@APIResponse(responseCode = "400", description = "Missing type or status query parameter",
				content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
	})
	public RestResponse<List<DuplicateRecordDto>> getDuplicates(@QueryParam("type") EntityType type, @QueryParam("status") DuplicateRecordStatus status) throws BusinessException {
		return RestResponse.ok(duplicateDetectionService.getDuplicates(type, status));
	}

	@GET
	@Path("/entity/{type}/{id}")
	@Operation(summary = "List duplicates for a specific entity", description = "Returns the duplicate records involving a given entity, filtered by resolution status (defaults to PENDING)")
	@APIResponse(responseCode = "200", description = "Duplicates found")
	public RestResponse<List<DuplicateRecordDto>> getDuplicatesForEntity(@PathParam("type") EntityType type, @PathParam("id") Long id,
			@DefaultValue("PENDING") @QueryParam("status") DuplicateRecordStatus status) {
		return RestResponse.ok(duplicateDetectionService.getDuplicatesForEntity(type, id, status));
	}

	@POST
	@Path("/{id}/resolve")
	@Operation(summary = "Resolve a duplicate", description = "Marks a detected duplicate as merged or not-a-duplicate")
	@APIResponse(responseCode = "204", description = "Duplicate resolved successfully")
	public RestResponse<Void> resolveDuplicate(@PathParam("id") Long id, ResolveDuplicateRequestDto request) {
		duplicateDetectionService.resolveDuplicate(id, request.action, request.keepEntityId);
		return RestResponse.noContent();
	}

}
