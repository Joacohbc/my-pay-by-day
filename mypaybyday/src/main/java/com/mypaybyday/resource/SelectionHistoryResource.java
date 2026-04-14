package com.mypaybyday.resource;

import java.util.List;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import com.mypaybyday.dto.RecordSelectionDto;
import com.mypaybyday.dto.UsageStatsDto;
import com.mypaybyday.enums.EntityType;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.SelectionHistoryService;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

@Path("/selection-history")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Selection History", description = "Endpoints to record UI selections and retrieve usage statistics")
public class SelectionHistoryResource {

	private final SelectionHistoryService selectionHistoryService;

	public SelectionHistoryResource(SelectionHistoryService selectionHistoryService) {
		this.selectionHistoryService = selectionHistoryService;
	}

	@POST
	@Operation(summary = "Record a UI selection", description = "Updates the selection history for a specific entity.")
	@APIResponse(responseCode = "204", description = "Selection recorded successfully")
	public Response recordSelection(RecordSelectionDto dto) throws BusinessException {
		selectionHistoryService.recordSelection(dto);
		return Response.noContent().build();
	}

	@GET
	@Operation(summary = "Get usage stats for an entity type", description = "Returns merged domain usage and UI selection statistics.")
	@APIResponse(responseCode = "200", description = "Usage statistics", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = UsageStatsDto.class, type = org.eclipse.microprofile.openapi.annotations.enums.SchemaType.ARRAY)))
	public Response getUsageStats(@QueryParam("entityType") EntityType entityType) {
		List<UsageStatsDto> stats = selectionHistoryService.getUsageStats(entityType);
		return Response.ok(stats).build();
	}
}
