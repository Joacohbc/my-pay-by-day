package com.mypaybyday.resource;

import com.mypaybyday.entity.Tag;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.TagService;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/tags")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class TagResource {

    @Inject
    TagService tagService;

    @GET
    public Response getAll() {
        return Response.ok(tagService.listAll()).build();
    }

    @GET
    @Path("/{id}")
    public Response getById(@PathParam("id") Long id) throws BusinessException {
        return Response.ok(tagService.findById(id)).build();
    }

    @POST
    public Response create(Tag tag) throws BusinessException {
        return Response.status(Response.Status.CREATED).entity(tagService.create(tag)).build();
    }

    @PUT
    @Path("/{id}")
    public Response update(@PathParam("id") Long id, Tag tagDetails) throws BusinessException {
        return Response.ok(tagService.update(id, tagDetails)).build();
    }

    @DELETE
    @Path("/{id}")
    public Response delete(@PathParam("id") Long id) throws BusinessException {
        tagService.delete(id);
        return Response.noContent().build();
    }
}
