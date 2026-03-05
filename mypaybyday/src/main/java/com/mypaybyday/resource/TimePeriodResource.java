package com.mypaybyday.resource;

import com.mypaybyday.entity.TimePeriod;
import com.mypaybyday.service.TimePeriodService;
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

@Path("/time-periods")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Time Periods", description = "Flexible budget containers with a date range, spending limit, and savings target. Events are associated dynamically by date, not by foreign key.")
public class TimePeriodResource {

    @Inject
    TimePeriodService timePeriodService;

    @GET
    @Operation(summary = "List all time periods")
    @APIResponse(responseCode = "200", description = "List of time periods",
            content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TimePeriod.class)))
    public Response getAll() {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Get time period by ID")
    @APIResponses({
            @APIResponse(responseCode = "200", description = "Time period found",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TimePeriod.class))),
            @APIResponse(responseCode = "404", description = "Time period not found")
    })
    public Response getById(
            @Parameter(description = "ID of the time period", required = true) @PathParam("id") Long id) {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    @POST
    @Operation(summary = "Create a new time period",
            description = "Defines a budget window with a start date, end date, optional budget limit, and optional savings target percentage.")
    @APIResponses({
            @APIResponse(responseCode = "201", description = "Time period created",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TimePeriod.class))),
            @APIResponse(responseCode = "400", description = "Validation error")
    })
    public Response create(TimePeriod timePeriod) {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    @PUT
    @Path("/{id}")
    @Operation(summary = "Update a time period")
    @APIResponses({
            @APIResponse(responseCode = "200", description = "Time period updated",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TimePeriod.class))),
            @APIResponse(responseCode = "400", description = "Validation error"),
            @APIResponse(responseCode = "404", description = "Time period not found")
    })
    public Response update(
            @Parameter(description = "ID of the time period", required = true) @PathParam("id") Long id,
            TimePeriod timePeriodDetails) {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Delete a time period")
    @APIResponses({
            @APIResponse(responseCode = "204", description = "Time period deleted"),
            @APIResponse(responseCode = "404", description = "Time period not found")
    })
    public Response delete(
            @Parameter(description = "ID of the time period", required = true) @PathParam("id") Long id) {
        throw new UnsupportedOperationException("Not implemented yet");
    }
}
