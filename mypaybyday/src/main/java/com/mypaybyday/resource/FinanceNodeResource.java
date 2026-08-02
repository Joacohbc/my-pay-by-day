package com.mypaybyday.resource;

import java.math.BigDecimal;
import java.util.List;

import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;

import com.mypaybyday.dto.ErrorResponseDto;
import com.mypaybyday.dto.FinanceNodeDto;
import com.mypaybyday.enums.FinanceNodeType;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.FinanceNodeService;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.jboss.resteasy.reactive.RestResponse;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

@Path("/finance-nodes")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Finance Nodes", description = "Core entities capable of holding, sending, or receiving value (accounts, external entities, contacts)")
public class FinanceNodeResource {

    private final FinanceNodeService financeNodeService;

    public FinanceNodeResource(FinanceNodeService financeNodeService) {
        this.financeNodeService = financeNodeService;
    }

    @GET
    @Operation(summary = "List finance nodes")
    @APIResponse(responseCode = "200", description = "List of finance nodes")
    public RestResponse<List<FinanceNodeDto>> getAll(
	@Parameter(description = "Filter by archived status") @QueryParam("archived") Boolean archived,
	@Parameter(description = "Filter by node type") @QueryParam("type") FinanceNodeType type) {
	return RestResponse.ok(financeNodeService.listAll(archived, type));
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Get finance node by ID")
    @APIResponses({
	@APIResponse(responseCode = "200", description = "Node found",
		content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = FinanceNodeDto.class))),
	@APIResponse(responseCode = "404", description = "Node not found or archived",
			content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
    })
    public RestResponse<FinanceNodeDto> getById(
	@Parameter(description = "ID of the finance node", required = true) @PathParam("id") Long id)
	throws BusinessException {
	return RestResponse.ok(financeNodeService.findById(id));
    }

    @POST
    @Operation(summary = "Create a new finance node")
    @APIResponses({
	@APIResponse(responseCode = "201", description = "Node created",
		content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = FinanceNodeDto.class))),
	@APIResponse(responseCode = "400", description = "Validation error",
			content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
    })
    public RestResponse<FinanceNodeDto> create(FinanceNodeDto node) {
	return RestResponse.status(RestResponse.Status.CREATED, financeNodeService.create(node));
    }

    @PUT
    @Path("/{id}")
    @Operation(summary = "Update a finance node")
    @APIResponses({
	@APIResponse(responseCode = "200", description = "Node updated",
		content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = FinanceNodeDto.class))),
	@APIResponse(responseCode = "400", description = "Validation error",
			content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class))),
	@APIResponse(responseCode = "404", description = "Node not found or archived",
			content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
    })
    public RestResponse<FinanceNodeDto> update(
	@Parameter(description = "ID of the finance node", required = true) @PathParam("id") Long id,
	FinanceNodeDto nodeDetails) throws BusinessException {
	return RestResponse.ok(financeNodeService.update(id, nodeDetails));
    }

    @POST
    @Path("/{id}/archive")
    @Operation(summary = "Archive a finance node",
	description = "Soft-deletes the node. Archived nodes are excluded from listings and cannot be used in new transactions. " +
		"This operation is always allowed even if the node has existing LineItems (Node Immutability Rule).")
    @APIResponses({
	@APIResponse(responseCode = "204", description = "Node archived"),
	@APIResponse(responseCode = "404", description = "Node not found",
			content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class))),
	@APIResponse(responseCode = "409", description = "Node still used by templates or subscriptions",
			content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
    })
    public RestResponse<Void> archive(
	@Parameter(description = "ID of the finance node", required = true) @PathParam("id") Long id)
	throws BusinessException {
	financeNodeService.archive(id);
	return RestResponse.noContent();
    }

    @POST
    @Path("/{id}/unarchive")
    @Operation(summary = "Unarchive a finance node",
	description = "Restores an archived node to active state.")
    @APIResponses({
	@APIResponse(responseCode = "204", description = "Node unarchived"),
	@APIResponse(responseCode = "404", description = "Node not found",
			content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
    })
    public RestResponse<Void> unarchive(
	@Parameter(description = "ID of the finance node", required = true) @PathParam("id") Long id)
	throws BusinessException {
	financeNodeService.unarchive(id);
	return RestResponse.noContent();
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Hard-delete a finance node",
	description = "Permanently deletes the node. Fails with 400 if the node has associated LineItems; use /archive instead.")
    @APIResponses({
	@APIResponse(responseCode = "204", description = "Node deleted"),
	@APIResponse(responseCode = "400", description = "Node has associated transactions; archive it instead",
			content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class))),
	@APIResponse(responseCode = "404", description = "Node not found",
			content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class))),
	@APIResponse(responseCode = "409", description = "Node still used by templates or subscriptions",
			content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
    })
    public RestResponse<Void> delete(
	@Parameter(description = "ID of the finance node", required = true) @PathParam("id") Long id)
	throws BusinessException {
	financeNodeService.delete(id);
	return RestResponse.noContent();
    }

    @GET
    @Path("/{id}/balance")
    @Operation(summary = "Calculate current balance of a node",
	description = "Sums all LineItem amounts associated with this node. Positive values represent inflows, negative values outflows.")
    @APIResponses({
	@APIResponse(responseCode = "200", description = "Calculated balance",
		content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = BigDecimal.class))),
	@APIResponse(responseCode = "404", description = "Node not found",
			content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
    })
    public RestResponse<BigDecimal> getBalance(
	@Parameter(description = "ID of the finance node", required = true) @PathParam("id") Long id)
	throws BusinessException {
	BigDecimal balance = financeNodeService.calculateBalance(id);
	return RestResponse.ok(balance);
    }
}
