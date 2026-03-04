package com.mypaybyday.resource;

import com.mypaybyday.entity.TimePeriod;
import com.mypaybyday.service.TimePeriodService;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/time-periods")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class TimePeriodResource {

    @Inject
    TimePeriodService timePeriodService;

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
    public Response create(TimePeriod timePeriod) {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    @PUT
    @Path("/{id}")
    public Response update(@PathParam("id") Long id, TimePeriod timePeriodDetails) {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    @DELETE
    @Path("/{id}")
    public Response delete(@PathParam("id") Long id) {
        throw new UnsupportedOperationException("Not implemented yet");
    }
}
