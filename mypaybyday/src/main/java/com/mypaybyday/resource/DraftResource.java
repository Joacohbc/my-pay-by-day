package com.mypaybyday.resource;

import java.util.List;

import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.PATCH;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import com.mypaybyday.dto.ConfirmDraftsRequestDto;
import com.mypaybyday.dto.ConfirmDraftsResultDto;
import com.mypaybyday.dto.DraftValidationResultDto;
import com.mypaybyday.dto.FinanceEventDraftInputDto;
import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.entity.DraftEntity;
import com.mypaybyday.enums.EntityType;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.DraftService;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

@Path("/drafts")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Drafts", description = "Operations related to incomplete entities bypassing strict validations using original DTOs")
public class DraftResource {

	private final DraftService draftService;

	@Inject
	public DraftResource(DraftService draftService) {
		this.draftService = draftService;
	}

	@GET
	@Operation(summary = "List all drafts")
	@APIResponse(responseCode = "200", description = "List of all drafts")
	public List<DraftEntity> listAll() {
		return draftService.listAll();
	}

	@GET
	@Path("/{id}")
	@Operation(summary = "Get a draft by its draft ID")
	@APIResponse(responseCode = "200", description = "Draft found")
	@APIResponse(responseCode = "400", description = "Draft not found (Business Exception)")
	public DraftEntity getById(@PathParam("id") Long id) {
		return draftService.findById(id);
	}

	@DELETE
	@Path("/{id}")
	@Operation(summary = "Delete a draft")
	@APIResponse(responseCode = "204", description = "Draft deleted successfully")
	@APIResponse(responseCode = "400", description = "Draft not found (Business Exception)")
	public Response delete(@PathParam("id") Long id) {
		draftService.delete(id);
		return Response.noContent().build();
	}

	@DELETE
	@Path("/finance-events")
	@Operation(summary = "Delete all finance event drafts")
	@APIResponse(responseCode = "204", description = "All finance event drafts deleted successfully")
	public Response deleteFinanceEventDrafts() {
		draftService.deleteFinanceEventDrafts();
		return Response.noContent().build();
	}

	// ── Endpoints specific to Finance Events using FinanceEventDto ──

	@GET
	@Path("/finance-events")
	@Operation(summary = "List all finance event drafts")
	@APIResponse(responseCode = "200", description = "List of finance event drafts")
	public List<FinanceEventDto> listFinanceEventDrafts() {
		return draftService.listFinanceEventDrafts();
	}

	@GET
	@Path("/finance-events/by-entity/{entityId}")
	@Operation(summary = "Get a finance event draft by original entity ID")
	@APIResponse(responseCode = "200", description = "Finance event draft found")
	@APIResponse(responseCode = "204", description = "No draft found for this entity")
	public Response getFinanceEventDraftByEntityId(@PathParam("entityId") Long entityId) {
		return draftService.findFinanceEventDraftByEntityId(entityId)
			.map(dto -> Response.ok(dto).build())
			.orElseGet(() -> Response.noContent().build());
	}

	@POST
	@Path("/finance-events")
	@Operation(summary = "Create a standalone finance event draft (never linked to an event, no dedup — multiple can coexist)")
	@APIResponse(responseCode = "201", description = "Finance event draft created successfully",
		content = @Content(schema = @Schema(implementation = DraftEntity.class)))
	public Response createStandaloneFinanceEventDraft(FinanceEventDraftInputDto dto) {
		DraftEntity draft = draftService.createStandaloneFinanceEventDraft(dto);
		return Response.status(Response.Status.CREATED).entity(draft).build();
	}

	@PATCH
	@Path("/finance-events/{id}")
	@Operation(summary = "Update an existing finance event draft, addressed by its own draft ID")
	@APIResponse(responseCode = "200", description = "Finance event draft updated successfully")
	@APIResponse(responseCode = "400", description = "Draft not found (Business Exception)")
	public DraftEntity updateFinanceEventDraftByDraftId(@PathParam("id") Long draftId, FinanceEventDraftInputDto dto) {
		return draftService.updateFinanceEventDraftByDraftId(draftId, dto);
	}

	@PUT
	@Path("/finance-events/by-entity/{entityId}")
	@Operation(summary = "Upsert the single finance event draft linked to an already-existing event, reusing it if one already exists")
	@APIResponse(responseCode = "200", description = "Finance event draft upserted successfully",
		content = @Content(schema = @Schema(implementation = DraftEntity.class)))
	@APIResponse(responseCode = "400", description = "Missing/invalid event ID (Business Exception)")
	public Response upsertFinanceEventDraftByEventId(@PathParam("entityId") Long entityId, FinanceEventDraftInputDto dto) throws BusinessException {
		DraftEntity draft = draftService.upsertFinanceEventDraftByEventId(entityId, dto);
		return Response.ok(draft).build();
	}

	@POST
	@Path("/finance-events/confirm-batch")
	@Operation(summary = "Confirm multiple finance event drafts in one call",
		description = "MERGE updates the linked event when a draft already has one, creating it otherwise. " +
			"CREATE_ONLY always creates a new event. Drafts that fail validation are skipped and reported " +
			"in the result instead of aborting the whole batch.")
	@APIResponse(responseCode = "200", description = "Batch processed (see result for any skipped drafts)",
		content = @Content(schema = @Schema(implementation = ConfirmDraftsResultDto.class)))
	@APIResponse(responseCode = "400", description = "No draft IDs supplied (Business Exception)")
	public ConfirmDraftsResultDto confirmFinanceEventDraftsBatch(ConfirmDraftsRequestDto request) throws BusinessException {
		return draftService.confirmDraftsBatch(request.draftIds, request.mode);
	}

	@POST
	@Path("/finance-events/{id}/validate")
	@Operation(summary = "Dry-run validate a finance event draft without persisting anything",
		description = "Runs the same integrity rules confirming a draft would enforce (name, date, zero-sum " +
			"line items, node existence) and reports every violation found instead of failing on the first one.")
	@APIResponse(responseCode = "200", description = "Validation result (valid may be true or false; errors lists every violation found)",
		content = @Content(schema = @Schema(implementation = DraftValidationResultDto.class)))
	@APIResponse(responseCode = "400", description = "Draft not found (Business Exception)")
	public DraftValidationResultDto validateFinanceEventDraft(@PathParam("id") Long draftId) throws BusinessException {
		return draftService.validateDraft(draftId);
	}
}
