package com.mypaybyday.resource;

import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.entity.EntityDraft;
import com.mypaybyday.enums.EntityType;
import com.mypaybyday.service.EntityDraftService;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PATCH;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import java.util.List;

@Path("/entity-drafts")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Entity Drafts", description = "Operations related to incomplete entities bypassing strict validations using original DTOs")
public class EntityDraftResource {

    private final EntityDraftService draftService;

    @Inject
    public EntityDraftResource(EntityDraftService draftService) {
        this.draftService = draftService;
    }

    @GET
    @Operation(summary = "List all entity drafts")
    @APIResponse(responseCode = "200", description = "List of all drafts")
    public List<EntityDraft> listAll() {
        return draftService.listAll();
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Get a draft by its draft ID")
    @APIResponse(responseCode = "200", description = "Draft found")
    @APIResponse(responseCode = "400", description = "Draft not found (Business Exception)")
    public EntityDraft getById(@PathParam("id") Long id) {
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
    @Operation(summary = "Create a new finance event draft from FinanceEventDto")
    @APIResponse(responseCode = "201", description = "Finance event draft created successfully")
    public Response createFinanceEventDraft(FinanceEventDto dto) {
        EntityDraft draft = draftService.create(EntityType.FINANCE_EVENT, dto);
        return Response.status(Response.Status.CREATED).entity(draft).build();
    }

    @PATCH
    @Path("/finance-events/{id}")
    @Operation(summary = "Update an existing finance event draft with a new FinanceEventDto payload")
    @APIResponse(responseCode = "200", description = "Finance event draft updated successfully")
    @APIResponse(responseCode = "400", description = "Draft not found (Business Exception)")
    public EntityDraft updateFinanceEventDraft(@PathParam("id") Long draftId, FinanceEventDto dto) {
        return draftService.update(draftId, dto);
    }
}
