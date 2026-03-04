package com.mypaybyday.resource;

import com.mypaybyday.entity.Transaction;
import com.mypaybyday.service.TransactionService;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/transactions")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class TransactionResource {

    @Inject
    TransactionService transactionService;

    @GET
    public Response getAll() {
        return Response.ok(transactionService.listAll()).build();
    }

    @GET
    @Path("/{id}")
    public Response getById(@PathParam("id") Long id) {
        Transaction transaction = transactionService.findById(id);
        if (transaction == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(transaction).build();
    }

    @POST
    public Response create(Transaction transaction) {
        return Response.status(Response.Status.CREATED).entity(transactionService.create(transaction)).build();
    }

    @PUT
    @Path("/{id}")
    public Response update(@PathParam("id") Long id, Transaction transactionDetails) {
        return Response.ok(transactionService.update(id, transactionDetails)).build();
    }

    @DELETE
    @Path("/{id}")
    public Response delete(@PathParam("id") Long id) {
        transactionService.delete(id);
        return Response.noContent().build();
    }
}
