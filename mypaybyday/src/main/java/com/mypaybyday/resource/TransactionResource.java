package com.mypaybyday.resource;

import com.mypaybyday.entity.FinanceTransaction;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.TransactionService;
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

@Path("/transactions")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Transactions", description = "Operational-layer accounting envelopes. Normally managed indirectly through Events; direct access for read/audit purposes.")
public class TransactionResource {

    @Inject
    TransactionService transactionService;

    @GET
    @Operation(summary = "List all transactions", description = "Returns every Transaction with its LineItems.")
    @APIResponse(responseCode = "200", description = "List of transactions",
            content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = FinanceTransaction.class)))
    public Response getAll() {
        return Response.ok(transactionService.listAll()).build();
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Get transaction by ID")
    @APIResponses({
            @APIResponse(responseCode = "200", description = "Transaction found",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = FinanceTransaction.class))),
            @APIResponse(responseCode = "404", description = "Transaction not found")
    })
    public Response getById(
            @Parameter(description = "ID of the transaction", required = true) @PathParam("id") Long id)
            throws BusinessException {
        return Response.ok(transactionService.findById(id)).build();
    }

    @POST
    @Operation(summary = "Create a transaction directly",
            description = "Creates a Transaction with its LineItems. The Zero-Sum Rule is enforced: " +
                    "sum of all positive amounts must equal the sum of all negative amounts. " +
                    "Prefer creating Events instead, as they wrap transactions with human context.")
    @APIResponses({
            @APIResponse(responseCode = "201", description = "Transaction created",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = FinanceTransaction.class))),
            @APIResponse(responseCode = "400", description = "Zero-Sum Rule violated or node not found")
    })
    public Response create(FinanceTransaction transaction) throws BusinessException {
        return Response.status(Response.Status.CREATED).entity(transactionService.create(transaction)).build();
    }

    @PUT
    @Path("/{id}")
    @Operation(summary = "Update a transaction",
            description = "Replaces the transaction date and all LineItems atomically. Zero-Sum Rule is re-validated.")
    @APIResponses({
            @APIResponse(responseCode = "200", description = "Transaction updated",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = FinanceTransaction.class))),
            @APIResponse(responseCode = "400", description = "Zero-Sum Rule violated or node not found"),
            @APIResponse(responseCode = "404", description = "Transaction not found")
    })
    public Response update(
            @Parameter(description = "ID of the transaction", required = true) @PathParam("id") Long id,
            FinanceTransaction transactionDetails) throws BusinessException {
        return Response.ok(transactionService.update(id, transactionDetails)).build();
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Delete a transaction")
    @APIResponses({
            @APIResponse(responseCode = "204", description = "Transaction deleted"),
            @APIResponse(responseCode = "404", description = "Transaction not found")
    })
    public Response delete(
            @Parameter(description = "ID of the transaction", required = true) @PathParam("id") Long id)
            throws BusinessException {
        transactionService.delete(id);
        return Response.noContent().build();
    }
}
