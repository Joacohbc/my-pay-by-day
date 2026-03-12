package com.mypaybyday.resource;

import com.mypaybyday.dto.FinanceNodeDto;
import com.mypaybyday.dto.PagedResponse;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.FinanceNodeService;
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

import java.math.BigDecimal;

@Path("/finance-nodes")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Finance Nodes", description = "Core entities capable of holding, sending, or receiving value (accounts, external entities, contacts)")
public class FinanceNodeResource {

    @Inject
    FinanceNodeService financeNodeService;

    @GET
    @Operation(summary = "List active finance nodes (paginated)", description = "Returns only non-archived nodes. Use ?page=0&size=20 to control pagination.")
    @APIResponse(responseCode = "200", description = "Paginated list of active nodes",
            content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = PagedResponse.class)))
    public Response getAll(
            @Parameter(description = "Zero-based page index") @QueryParam("page") @DefaultValue("0") int page,
            @Parameter(description = "Page size") @QueryParam("size") @DefaultValue("20") int size,
            @Parameter(description = "Filter by archived status") @QueryParam("archived") Boolean archived) {
        return Response.ok(financeNodeService.listAll(page, size, archived)).build();
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Get finance node by ID")
    @APIResponses({
            @APIResponse(responseCode = "200", description = "Node found",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = FinanceNodeDto.class))),
            @APIResponse(responseCode = "404", description = "Node not found or archived")
    })
    public Response getById(
            @Parameter(description = "ID of the finance node", required = true) @PathParam("id") Long id) {
        FinanceNodeDto node = financeNodeService.findById(id);
        if (node == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(node).build();
    }

    @POST
    @Operation(summary = "Create a new finance node")
    @APIResponses({
            @APIResponse(responseCode = "201", description = "Node created",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = FinanceNodeDto.class))),
            @APIResponse(responseCode = "400", description = "Validation error")
    })
    public Response create(FinanceNodeDto node) {
        return Response.status(Response.Status.CREATED).entity(financeNodeService.create(node)).build();
    }

    @PATCH
    @Path("/{id}")
    @Operation(summary = "Update a finance node")
    @APIResponses({
            @APIResponse(responseCode = "200", description = "Node updated",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = FinanceNodeDto.class))),
            @APIResponse(responseCode = "400", description = "Validation error"),
            @APIResponse(responseCode = "404", description = "Node not found or archived")
    })
    public Response update(
            @Parameter(description = "ID of the finance node", required = true) @PathParam("id") Long id,
            FinanceNodeDto nodeDetails) throws BusinessException {
        return Response.ok(financeNodeService.update(id, nodeDetails)).build();
    }

    @PATCH
    @Path("/{id}/archive")
    @Operation(summary = "Archive a finance node",
            description = "Soft-deletes the node. Archived nodes are excluded from listings and cannot be used in new transactions. " +
                    "This operation is always allowed even if the node has existing LineItems (Node Immutability Rule).")
    @APIResponses({
            @APIResponse(responseCode = "204", description = "Node archived"),
            @APIResponse(responseCode = "404", description = "Node not found")
    })
    public Response archive(
            @Parameter(description = "ID of the finance node", required = true) @PathParam("id") Long id)
            throws BusinessException {
        financeNodeService.archive(id);
        return Response.noContent().build();
    }

    @PATCH
    @Path("/{id}/unarchive")
    @Operation(summary = "Unarchive a finance node",
            description = "Restores an archived node to active state.")
    @APIResponses({
            @APIResponse(responseCode = "204", description = "Node unarchived"),
            @APIResponse(responseCode = "404", description = "Node not found")
    })
    public Response unarchive(
            @Parameter(description = "ID of the finance node", required = true) @PathParam("id") Long id)
            throws BusinessException {
        financeNodeService.unarchive(id);
        return Response.noContent().build();
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Hard-delete a finance node",
            description = "Permanently deletes the node. Fails with 400 if the node has associated LineItems; use /archive instead.")
    @APIResponses({
            @APIResponse(responseCode = "204", description = "Node deleted"),
            @APIResponse(responseCode = "400", description = "Node has associated transactions; archive it instead"),
            @APIResponse(responseCode = "404", description = "Node not found")
    })
    public Response delete(
            @Parameter(description = "ID of the finance node", required = true) @PathParam("id") Long id)
            throws BusinessException {
        financeNodeService.delete(id);
        return Response.noContent().build();
    }

    @GET
    @Path("/{id}/balance")
    @Operation(summary = "Calculate current balance of a node",
            description = "Sums all LineItem amounts associated with this node. Positive values represent inflows, negative values outflows.")
    @APIResponses({
            @APIResponse(responseCode = "200", description = "Calculated balance",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = BigDecimal.class))),
            @APIResponse(responseCode = "404", description = "Node not found")
    })
    public Response getBalance(
            @Parameter(description = "ID of the finance node", required = true) @PathParam("id") Long id)
            throws BusinessException {
        BigDecimal balance = financeNodeService.calculateBalance(id);
        return Response.ok(balance).build();
    }
}
