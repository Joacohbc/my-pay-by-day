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
        return Response.ok(timePeriodService.listAll()).build();
    }

    @GET
    @Path("/{id}")
    public Response getById(@PathParam("id") Long id) {
        TimePeriod timePeriod = timePeriodService.findById(id);
        if (timePeriod == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(timePeriod).build();
    }

    @POST
    public Response create(TimePeriod timePeriod) {
        return Response.status(Response.Status.CREATED).entity(timePeriodService.create(timePeriod)).build();
    }

    @PUT
    @Path("/{id}")
    public Response update(@PathParam("id") Long id, TimePeriod timePeriodDetails) {
        return Response.ok(timePeriodService.update(id, timePeriodDetails)).build();
    }

    @DELETE
    @Path("/{id}")
    public Response delete(@PathParam("id") Long id) {
        timePeriodService.delete(id);
        return Response.noContent().build();
    }
}
