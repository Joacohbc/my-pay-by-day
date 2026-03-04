package com.mypaybyday.resource;

import com.mypaybyday.entity.FinanceEvent;
import com.mypaybyday.repository.EventRepository;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/events")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class EventResource {

    @Inject
    EventRepository eventRepository;

    @GET
    public Response getAll() {
        return Response.ok(eventRepository.listAll()).build();
    }

    @GET
    @Path("/{id}")
    public Response getById(@PathParam("id") Long id) {
        FinanceEvent event = eventRepository.findById(id);
        if (event == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(event).build();
    }

    @POST
    @Transactional
    public Response create(FinanceEvent event) {
        eventRepository.persist(event);
        return Response.status(Response.Status.CREATED).entity(event).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public Response update(@PathParam("id") Long id, FinanceEvent eventDetails) {
        FinanceEvent event = eventRepository.findById(id);
        if (event == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        event.name = eventDetails.name;
        event.description = eventDetails.description;
        event.receiptUrl = eventDetails.receiptUrl;
        event.transaction = eventDetails.transaction;
        return Response.ok(event).build();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") Long id) {
        FinanceEvent event = eventRepository.findById(id);
        if (event == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        eventRepository.delete(event);
        return Response.noContent().build();
    }
}
