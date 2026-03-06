package com.mypaybyday.resource;

import com.mypaybyday.dto.FinanceEventDto;
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
    @Operation(summary = "List all events", description = "Returns every FinanceEvent stored in the system, including its nested Transaction and LineItems.")
    @APIResponse(responseCode = "200", description = "List of events",
            content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = FinanceEventDto.class)))
    public Response getAll() {
        return Response.ok(eventService.listAll()).build();
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

    @PUT
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
            FinanceEvent eventDetails) throws BusinessException {
        return Response.ok(eventService.update(id, eventDetails)).build();
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
}
