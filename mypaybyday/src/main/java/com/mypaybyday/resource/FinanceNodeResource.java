package com.mypaybyday.resource;

import com.mypaybyday.entity.FinanceNode;
import com.mypaybyday.service.FinanceNodeService;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.math.BigDecimal;

@Path("/finance-nodes")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class FinanceNodeResource {

    @Inject
    FinanceNodeService financeNodeService;

    @GET
    public Response getAll() {
        return Response.ok(financeNodeService.listAll()).build();
    }

    @GET
    @Path("/{id}")
    public Response getById(@PathParam("id") Long id) {
        FinanceNode node = financeNodeService.findById(id);
        if (node == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(node).build();
    }

    @POST
    public Response create(FinanceNode node) {
        return Response.status(Response.Status.CREATED).entity(financeNodeService.create(node)).build();
    }

    @PUT
    @Path("/{id}")
    public Response update(@PathParam("id") Long id, FinanceNode nodeDetails) {
        return Response.ok(financeNodeService.update(id, nodeDetails)).build();
    }

    @PUT
    @Path("/{id}/archive")
    public Response archive(@PathParam("id") Long id) {
        financeNodeService.archive(id);
        return Response.noContent().build();
    }

    @DELETE
    @Path("/{id}")
    public Response delete(@PathParam("id") Long id) {
        financeNodeService.delete(id);
        return Response.noContent().build();
    }

    @GET
    @Path("/{id}/balance")
    public Response getBalance(@PathParam("id") Long id) {
        BigDecimal balance = financeNodeService.calculateBalance(id);
        return Response.ok(balance).build();
    }
}
