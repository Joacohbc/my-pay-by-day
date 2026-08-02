package com.mypaybyday.resource;

import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;

import com.mypaybyday.dto.ErrorResponseDto;
import com.mypaybyday.dto.PagedResponse;
import com.mypaybyday.dto.SubscriptionDto;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.SubscriptionService;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.jboss.resteasy.reactive.RestResponse;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

@Path("/subscriptions")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Subscriptions", description = "Recurring agreement factory: uses a Template to auto-generate Events on each billing cycle")
public class SubscriptionResource {

    private final SubscriptionService subscriptionService;

    public SubscriptionResource(SubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    @GET
    @Operation(summary = "List subscriptions (paginated)")
    @APIResponse(responseCode = "200", description = "Paginated list of subscriptions",
	content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = PagedResponse.class)))
    public RestResponse<PagedResponse<SubscriptionDto>> getAll(
	@Parameter(description = "Zero-based page index") @QueryParam("page") @DefaultValue("0") int page,
	@Parameter(description = "Page size") @QueryParam("size") @DefaultValue("20") int size) {
	return RestResponse.ok(subscriptionService.listAll(page, size));
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Get subscription by ID")
    @APIResponses({
	@APIResponse(responseCode = "200", description = "Subscription found",
		content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = SubscriptionDto.class))),
	@APIResponse(responseCode = "404", description = "Subscription not found",
			content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
    })
    public RestResponse<SubscriptionDto> getById(
	@Parameter(description = "ID of the subscription", required = true) @PathParam("id") Long id)
	throws BusinessException {
	return RestResponse.ok(subscriptionService.findById(id));
    }

    @POST
    @Operation(summary = "Create a new subscription",
	description = "Registers a recurring agreement. A Template must be referenced to drive automatic Event generation.")
    @APIResponses({
	@APIResponse(responseCode = "201", description = "Subscription created",
		content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = SubscriptionDto.class))),
	@APIResponse(responseCode = "400", description = "Validation error",
			content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
    })
    public RestResponse<SubscriptionDto> create(SubscriptionDto subscription) throws BusinessException {
	return RestResponse.status(RestResponse.Status.CREATED, subscriptionService.create(subscription));
    }

    @PATCH
    @Path("/{id}")
    @Operation(summary = "Update a subscription")
    @APIResponses({
	@APIResponse(responseCode = "200", description = "Subscription updated",
		content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = SubscriptionDto.class))),
	@APIResponse(responseCode = "400", description = "Validation error",
			content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class))),
	@APIResponse(responseCode = "404", description = "Subscription not found",
			content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
    })
    public RestResponse<SubscriptionDto> update(
	@Parameter(description = "ID of the subscription", required = true) @PathParam("id") Long id,
	SubscriptionDto subscriptionDetails) throws BusinessException {
	return RestResponse.ok(subscriptionService.update(id, subscriptionDetails));
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Delete a subscription")
    @APIResponses({
	@APIResponse(responseCode = "204", description = "Subscription deleted"),
	@APIResponse(responseCode = "404", description = "Subscription not found",
			content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
    })
    public RestResponse<Void> delete(
	@Parameter(description = "ID of the subscription", required = true) @PathParam("id") Long id)
	throws BusinessException {
	subscriptionService.delete(id);
	return RestResponse.noContent();
    }

    @POST
    @Path("/{id}/execute")
    @Operation(summary = "Execute a subscription now, generating a finance event from its template")
    @APIResponses({
	@APIResponse(responseCode = "200", description = "Subscription executed"),
	@APIResponse(responseCode = "404", description = "Subscription not found",
			content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
    })
    public RestResponse<Void> execute(
	@Parameter(description = "ID of the subscription", required = true) @PathParam("id") Long id)
	throws BusinessException {
	subscriptionService.processSubscription(id);
	return RestResponse.ok();
    }

    @POST
    @Path("/{id}/cancel")
    @Operation(summary = "Cancel a subscription, stopping future automatic event generation")
    @APIResponses({
	@APIResponse(responseCode = "200", description = "Subscription cancelled",
	    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = SubscriptionDto.class))),
	@APIResponse(responseCode = "404", description = "Subscription not found",
			content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
    })
    public RestResponse<SubscriptionDto> cancel(
	@Parameter(description = "ID of the subscription", required = true) @PathParam("id") Long id)
	throws BusinessException {
	return RestResponse.ok(subscriptionService.cancel(id));
    }
}
