package com.mypaybyday.resource;

import com.mypaybyday.entity.Subscription;
import com.mypaybyday.repository.SubscriptionRepository;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/subscriptions")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class SubscriptionResource {

    @Inject
    SubscriptionRepository subscriptionRepository;

    @GET
    public Response getAll() {
        return Response.ok(subscriptionRepository.listAll()).build();
    }

    @GET
    @Path("/{id}")
    public Response getById(@PathParam("id") Long id) {
        Subscription subscription = subscriptionRepository.findById(id);
        if (subscription == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(subscription).build();
    }

    @POST
    @Transactional
    public Response create(Subscription subscription) {
        subscriptionRepository.persist(subscription);
        return Response.status(Response.Status.CREATED).entity(subscription).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public Response update(@PathParam("id") Long id, Subscription subscriptionDetails) {
        Subscription subscription = subscriptionRepository.findById(id);
        if (subscription == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        subscription.name = subscriptionDetails.name;
        subscription.template = subscriptionDetails.template;
        subscription.recurrence = subscriptionDetails.recurrence;
        subscription.nextExecutionDate = subscriptionDetails.nextExecutionDate;
        return Response.ok(subscription).build();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") Long id) {
        Subscription subscription = subscriptionRepository.findById(id);
        if (subscription == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        subscriptionRepository.delete(subscription);
        return Response.noContent().build();
    }
}
