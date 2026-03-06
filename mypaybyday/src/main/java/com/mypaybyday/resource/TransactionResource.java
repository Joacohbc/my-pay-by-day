package com.mypaybyday.resource;

import com.mypaybyday.dto.FinanceTransactionDto;
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
@Tag(name = "Transactions", description = "Read-only view of the operational-layer accounting envelopes. Transactions are created, updated, and deleted exclusively through the /events endpoints (Wrapper Isolation Rule).")
public class TransactionResource {

    @Inject
    TransactionService transactionService;

    @GET
    @Operation(summary = "List all transactions", description = "Returns every Transaction with its LineItems. Read-only audit endpoint.")
    @APIResponse(responseCode = "200", description = "List of transactions",
            content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = FinanceTransactionDto.class)))
    public Response getAll() {
        return Response.ok(transactionService.listAll()).build();
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Get transaction by ID", description = "Read-only audit endpoint.")
    @APIResponses({
            @APIResponse(responseCode = "200", description = "Transaction found",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = FinanceTransactionDto.class))),
            @APIResponse(responseCode = "404", description = "Transaction not found")
    })
    public Response getById(
            @Parameter(description = "ID of the transaction", required = true) @PathParam("id") Long id)
            throws BusinessException {
        return Response.ok(transactionService.findById(id)).build();
    }
}
