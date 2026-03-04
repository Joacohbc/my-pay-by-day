package com.mypaybyday.resource;

import com.mypaybyday.entity.Subscription;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/subscriptions")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class SubscriptionResource {

    @GET
    public Response getAll() {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    @GET
    @Path("/{id}")
    public Response getById(@PathParam("id") Long id) {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    @POST
    public Response create(Subscription subscription) {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    @PUT
    @Path("/{id}")
    public Response update(@PathParam("id") Long id, Subscription subscriptionDetails) {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    @DELETE
    @Path("/{id}")
    public Response delete(@PathParam("id") Long id) {
        throw new UnsupportedOperationException("Not implemented yet");
    }
}
