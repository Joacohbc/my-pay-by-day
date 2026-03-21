package com.mypaybyday.resource;

import com.mypaybyday.dto.FinanceEventDraftDto;
import com.mypaybyday.service.FinanceEventDraftService;
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

@Path("/finance-event-drafts")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Finance Event Drafts", description = "Operations related to incomplete Finance Events bypassing validations")
public class FinanceEventDraftResource {

    private final FinanceEventDraftService draftService;

    @Inject
    public FinanceEventDraftResource(FinanceEventDraftService draftService) {
        this.draftService = draftService;
    }

    @GET
    @Operation(summary = "List all event drafts")
    @APIResponse(responseCode = "200", description = "List of drafts")
    public List<FinanceEventDraftDto> listAll() {
        return draftService.listAll();
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Get a draft by ID")
    @APIResponse(responseCode = "200", description = "Draft found")
    @APIResponse(responseCode = "400", description = "Draft not found (Business Exception)")
    public FinanceEventDraftDto getById(@PathParam("id") Long id) {
        return draftService.findById(id);
    }

    @POST
    @Operation(summary = "Create a new event draft")
    @APIResponse(responseCode = "201", description = "Draft created successfully")
    public Response create(FinanceEventDraftDto dto) {
        FinanceEventDraftDto created = draftService.create(dto);
        return Response.status(Response.Status.CREATED).entity(created).build();
    }

    @PATCH
    @Path("/{id}")
    @Operation(summary = "Update an existing draft (partial update)")
    @APIResponse(responseCode = "200", description = "Draft updated successfully")
    @APIResponse(responseCode = "400", description = "Draft not found (Business Exception)")
    public FinanceEventDraftDto update(@PathParam("id") Long id, FinanceEventDraftDto dto) {
        return draftService.update(id, dto);
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
}
