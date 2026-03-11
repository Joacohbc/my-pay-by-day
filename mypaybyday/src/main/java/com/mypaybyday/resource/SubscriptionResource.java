package com.mypaybyday.resource;

import com.mypaybyday.dto.PagedResponse;
import com.mypaybyday.dto.SubscriptionDto;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.SubscriptionService;
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

@Path("/subscriptions")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Subscriptions", description = "Recurring agreement factory: uses a Template to auto-generate Events on each billing cycle")
public class SubscriptionResource {

    @Inject
    SubscriptionService subscriptionService;

    @GET
    @Operation(summary = "List subscriptions (paginated)")
    @APIResponse(responseCode = "200", description = "Paginated list of subscriptions",
            content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = PagedResponse.class)))
    public Response getAll(
            @Parameter(description = "Zero-based page index") @QueryParam("page") @DefaultValue("0") int page,
            @Parameter(description = "Page size") @QueryParam("size") @DefaultValue("20") int size) {
        return Response.ok(subscriptionService.listAll(page, size)).build();
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Get subscription by ID")
    @APIResponses({
            @APIResponse(responseCode = "200", description = "Subscription found",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = SubscriptionDto.class))),
            @APIResponse(responseCode = "404", description = "Subscription not found")
    })
    public Response getById(
            @Parameter(description = "ID of the subscription", required = true) @PathParam("id") Long id)
            throws BusinessException {
        return Response.ok(subscriptionService.findById(id)).build();
    }

    @POST
    @Operation(summary = "Create a new subscription",
            description = "Registers a recurring agreement. A Template must be referenced to drive automatic Event generation.")
    @APIResponses({
            @APIResponse(responseCode = "201", description = "Subscription created",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = SubscriptionDto.class))),
            @APIResponse(responseCode = "400", description = "Validation error")
    })
    public Response create(SubscriptionDto subscription) throws BusinessException {
        return Response.status(Response.Status.CREATED)
                .entity(subscriptionService.create(subscription))
                .build();
    }

    @PATCH
    @Path("/{id}")
    @Operation(summary = "Update a subscription")
    @APIResponses({
            @APIResponse(responseCode = "200", description = "Subscription updated",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = SubscriptionDto.class))),
            @APIResponse(responseCode = "400", description = "Validation error"),
            @APIResponse(responseCode = "404", description = "Subscription not found")
    })
    public Response update(
            @Parameter(description = "ID of the subscription", required = true) @PathParam("id") Long id,
            SubscriptionDto subscriptionDetails) throws BusinessException {
        return Response.ok(subscriptionService.update(id, subscriptionDetails)).build();
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Delete a subscription")
    @APIResponses({
            @APIResponse(responseCode = "204", description = "Subscription deleted"),
            @APIResponse(responseCode = "404", description = "Subscription not found")
    })
    public Response delete(
            @Parameter(description = "ID of the subscription", required = true) @PathParam("id") Long id)
            throws BusinessException {
        subscriptionService.delete(id);
        return Response.noContent().build();
    }
}
