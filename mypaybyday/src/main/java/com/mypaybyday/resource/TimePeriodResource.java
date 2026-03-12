package com.mypaybyday.resource;

import com.mypaybyday.dto.PagedResponse;
import com.mypaybyday.dto.TimePeriodBalanceDto;
import com.mypaybyday.dto.DynamicTimePeriodBalanceDto;
import com.mypaybyday.dto.TimePeriodDto;
import com.mypaybyday.exception.BusinessException;
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
    @Operation(summary = "List time periods (paginated)")
    @APIResponse(responseCode = "200", description = "Paginated list of time periods",
            content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = PagedResponse.class)))
    public Response getAll(
            @Parameter(description = "Zero-based page index") @QueryParam("page") @DefaultValue("0") int page,
            @Parameter(description = "Page size") @QueryParam("size") @DefaultValue("20") int size) {
        return Response.ok(timePeriodService.listAll(page, size)).build();
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Get time period by ID")
    @APIResponses({
            @APIResponse(responseCode = "200", description = "Time period found",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TimePeriodDto.class))),
            @APIResponse(responseCode = "404", description = "Time period not found")
    })
    public Response getById(
            @Parameter(description = "ID of the time period", required = true) @PathParam("id") Long id)
            throws BusinessException {
        return Response.ok(timePeriodService.findById(id)).build();
    }

    @GET
    @Path("/{id}/balance")
    @Operation(summary = "Get balance summary for a time period",
            description = "Returns the time period together with the total income and outbound amounts, "
                    + "plus the list of all Events dynamically associated to the period by their transaction date.")
    @APIResponses({
            @APIResponse(responseCode = "200", description = "Balance summary",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TimePeriodBalanceDto.class))),
            @APIResponse(responseCode = "404", description = "Time period not found")
    })
    public Response getBalance(
            @Parameter(description = "ID of the time period", required = true) @PathParam("id") Long id)
            throws BusinessException {
        return Response.ok(timePeriodService.getBalance(id)).build();
    }

    @GET
    @Path("/dynamic-balance")
    @Operation(summary = "Get balance summary for a custom date range",
            description = "Returns the total income, outbound amounts, and the list of Events dynamically associated to the provided date range.")
    @APIResponses({
            @APIResponse(responseCode = "200", description = "Balance summary",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = DynamicTimePeriodBalanceDto.class))),
            @APIResponse(responseCode = "400", description = "Validation error")
    })
    public Response getDynamicBalance(
            @Parameter(description = "Start date (YYYY-MM-DD)", required = true) @QueryParam("startDate") java.time.LocalDate startDate,
            @Parameter(description = "End date (YYYY-MM-DD)", required = true) @QueryParam("endDate") java.time.LocalDate endDate)
            throws BusinessException {
        return Response.ok(timePeriodService.getDynamicBalance(startDate, endDate)).build();
    }

    @POST
    @Operation(summary = "Create a new time period",
            description = "Defines a budget window with a start date, end date, optional budget limit, and optional savings target percentage.")
    @APIResponses({
            @APIResponse(responseCode = "201", description = "Time period created",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TimePeriodDto.class))),
            @APIResponse(responseCode = "400", description = "Validation error")
    })
    public Response create(TimePeriodDto timePeriod) throws BusinessException {
        return Response.status(Response.Status.CREATED).entity(timePeriodService.create(timePeriod)).build();
    }

    @PATCH
    @Path("/{id}")
    @Operation(summary = "Partially update a time period",
            description = "Only the fields present (non-null) in the request body are applied. Omitted fields are left unchanged.")
    @APIResponses({
            @APIResponse(responseCode = "200", description = "Time period updated",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TimePeriodDto.class))),
            @APIResponse(responseCode = "400", description = "Validation error"),
            @APIResponse(responseCode = "404", description = "Time period not found")
    })
    public Response update(
            @Parameter(description = "ID of the time period", required = true) @PathParam("id") Long id,
            TimePeriodDto timePeriodDetails) throws BusinessException {
        return Response.ok(timePeriodService.patch(id, timePeriodDetails)).build();
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Delete a time period")
    @APIResponses({
            @APIResponse(responseCode = "204", description = "Time period deleted"),
            @APIResponse(responseCode = "404", description = "Time period not found")
    })
    public Response delete(
            @Parameter(description = "ID of the time period", required = true) @PathParam("id") Long id)
            throws BusinessException {
        timePeriodService.delete(id);
        return Response.noContent().build();
    }
}

