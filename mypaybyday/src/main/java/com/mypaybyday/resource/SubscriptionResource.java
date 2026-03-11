package com.mypaybyday.resource;

import com.mypaybyday.entity.Subscription;
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

    @GET
    @Operation(summary = "List all subscriptions")
    @APIResponse(responseCode = "200", description = "List of subscriptions",
            content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = Subscription.class)))
    public Response getAll() {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Get subscription by ID")
    @APIResponses({
            @APIResponse(responseCode = "200", description = "Subscription found",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = Subscription.class))),
            @APIResponse(responseCode = "404", description = "Subscription not found")
    })
    public Response getById(
            @Parameter(description = "ID of the subscription", required = true) @PathParam("id") Long id) {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    @POST
    @Operation(summary = "Create a new subscription",
            description = "Registers a recurring agreement. A Template must be referenced to drive automatic Event generation.")
    @APIResponses({
            @APIResponse(responseCode = "201", description = "Subscription created",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = Subscription.class))),
            @APIResponse(responseCode = "400", description = "Validation error")
    })
    public Response create(Subscription subscription) {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    @PATCH
    @Path("/{id}")
    @Operation(summary = "Update a subscription")
    @APIResponses({
            @APIResponse(responseCode = "200", description = "Subscription updated",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = Subscription.class))),
            @APIResponse(responseCode = "400", description = "Validation error"),
            @APIResponse(responseCode = "404", description = "Subscription not found")
    })
    public Response update(
            @Parameter(description = "ID of the subscription", required = true) @PathParam("id") Long id,
            Subscription subscriptionDetails) {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Delete a subscription")
    @APIResponses({
            @APIResponse(responseCode = "204", description = "Subscription deleted"),
            @APIResponse(responseCode = "404", description = "Subscription not found")
    })
    public Response delete(
            @Parameter(description = "ID of the subscription", required = true) @PathParam("id") Long id) {
        throw new UnsupportedOperationException("Not implemented yet");
    }
}
