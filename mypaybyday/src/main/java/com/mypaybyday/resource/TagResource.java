package com.mypaybyday.resource;

import com.mypaybyday.entity.Tag;
import com.mypaybyday.repository.TagRepository;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/tags")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class TagResource {

    @Inject
    TagRepository tagRepository;

    @GET
    public Response getAll() {
        return Response.ok(tagRepository.listAll()).build();
    }

    @GET
    @Path("/{id}")
    public Response getById(@PathParam("id") Long id) {
        Tag tag = tagRepository.findById(id);
        if (tag == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(tag).build();
    }

    @POST
    @Transactional
    public Response create(Tag tag) {
        tagRepository.persist(tag);
        return Response.status(Response.Status.CREATED).entity(tag).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public Response update(@PathParam("id") Long id, Tag tagDetails) {
        Tag tag = tagRepository.findById(id);
        if (tag == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        tag.name = tagDetails.name;
        tag.description = tagDetails.description;
        return Response.ok(tag).build();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") Long id) {
        Tag tag = tagRepository.findById(id);
        if (tag == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        tagRepository.delete(tag);
        return Response.noContent().build();
    }
}
