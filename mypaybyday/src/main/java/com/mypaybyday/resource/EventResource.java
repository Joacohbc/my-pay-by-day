package com.mypaybyday.resource;

import com.mypaybyday.dto.EventQuery;
import com.mypaybyday.dto.EventQuery.DateField;
import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.PagedResponse;
import com.mypaybyday.dto.PatchEventDto;
import com.mypaybyday.entity.FinanceEvent;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.EventService;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

@Path("/events")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Events", description = "Experience-layer wrapper: human-readable financial events that encapsulate a Transaction")
public class EventResource {

    @Inject
    EventService eventService;

    @GET
    @Operation(summary = "List events (paginated)", description = "Returns a paginated page of FinanceEvents with optional filtering.")
    @APIResponse(responseCode = "200", description = "Paginated list of events",
            content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = PagedResponse.class)))
    public Response getAll(
            @Parameter(description = "Zero-based page index") @QueryParam("page") @DefaultValue("0") int page,
            @Parameter(description = "Page size") @QueryParam("size") @DefaultValue("20") int size,
            @Parameter(description = "Filter by text in name or description") @QueryParam("search") String search,
            @Parameter(description = "Filter by start date (YYYY-MM-DD)") @QueryParam("startDate") String startDate,
            @Parameter(description = "Filter by end date (YYYY-MM-DD)") @QueryParam("endDate") String endDate,
            @Parameter(description = "Date field to filter on: TRANSACTION, CREATED, UPDATED") @QueryParam("dateField") @DefaultValue("TRANSACTION") DateField dateField,
            @Parameter(description = "Filter by event type") @QueryParam("type") com.mypaybyday.enums.EventType type,
            @Parameter(description = "Filter by category ID") @QueryParam("categoryId") Long categoryId,
            @Parameter(description = "Filter by tag ID") @QueryParam("tagId") Long tagId) {

        return Response.ok(eventService.listAll(EventQuery.builder()
                .page(page).size(size)
                .search(search).startDate(startDate).endDate(endDate).dateField(dateField)
                .type(type).categoryId(categoryId).tagId(tagId)
                .build())).build();
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Get event by ID")
    @APIResponses({
            @APIResponse(responseCode = "200", description = "Event found",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = FinanceEventDto.class))),
            @APIResponse(responseCode = "404", description = "Event not found")
    })
    public Response getById(
            @Parameter(description = "ID of the event", required = true) @PathParam("id") Long id)
            throws BusinessException {
        return Response.ok(eventService.findById(id)).build();
    }

    @POST
    @Operation(summary = "Create a new event",
            description = "Creates a FinanceEvent together with its inner Transaction. " +
                    "The body must include a non-null transaction with at least one lineItem. " +
                    "The Zero-Sum Rule is validated before persisting.")
    @APIResponses({
            @APIResponse(responseCode = "201", description = "Event created",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = FinanceEventDto.class))),
            @APIResponse(responseCode = "400", description = "Validation error (e.g. zero-sum violated)")
    })
    public Response create(FinanceEvent event) throws BusinessException {
        return Response.status(Response.Status.CREATED).entity(eventService.create(event)).build();
    }

    @PATCH
    @Path("/{id}")
    @Operation(summary = "Update an existing event",
            description = "Updates metadata, category, tags, and/or the nested Transaction. " +
                    "The Zero-Sum Rule is re-validated whenever lineItems change.")
    @APIResponses({
            @APIResponse(responseCode = "200", description = "Event updated",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = FinanceEventDto.class))),
            @APIResponse(responseCode = "400", description = "Validation error"),
            @APIResponse(responseCode = "404", description = "Event not found")
    })
    public Response update(
            @Parameter(description = "ID of the event", required = true) @PathParam("id") Long id,
            PatchEventDto patch) throws BusinessException {
        return Response.ok(eventService.update(id, patch)).build();
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Delete an event", description = "Permanently deletes the event and its associated Transaction (cascade).")
    @APIResponses({
            @APIResponse(responseCode = "204", description = "Event deleted"),
            @APIResponse(responseCode = "404", description = "Event not found")
    })
    public Response delete(
            @Parameter(description = "ID of the event", required = true) @PathParam("id") Long id)
            throws BusinessException {
        eventService.delete(id);
        return Response.noContent().build();
    }

    @POST
    @Path("/{id}/relations")
    @Operation(summary = "Add bidirectional relations to other events")
    @APIResponses({
            @APIResponse(responseCode = "200", description = "Relations added successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = FinanceEventDto.class))),
            @APIResponse(responseCode = "404", description = "Event not found")
    })
    public Response addRelations(
            @Parameter(description = "ID of the event", required = true) @PathParam("id") Long id,
            @Parameter(description = "List of related event IDs", required = true) java.util.List<Long> relatedIds) 
            throws BusinessException {
        return Response.ok(eventService.addRelations(id, relatedIds)).build();
    }

    @DELETE
    @Path("/{id}/relations")
    @Operation(summary = "Remove bidirectional relations to multiple events")
    @APIResponses({
            @APIResponse(responseCode = "200", description = "Relations removed successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = FinanceEventDto.class))),
            @APIResponse(responseCode = "404", description = "Event not found")
    })
    public Response removeRelations(
            @Parameter(description = "ID of the event", required = true) @PathParam("id") Long id,
            @Parameter(description = "List of related event IDs to remove", required = true) java.util.List<Long> relatedIds)
            throws BusinessException {
        return Response.ok(eventService.removeRelations(id, relatedIds)).build();
    }
}
