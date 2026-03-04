package com.mypaybyday.resource;

import com.mypaybyday.entity.Category;
import com.mypaybyday.repository.CategoryRepository;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/categories")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class CategoryResource {

    @Inject
    CategoryRepository categoryRepository;

    @GET
    public Response getAll() {
        return Response.ok(categoryRepository.listAll()).build();
    }

    @GET
    @Path("/{id}")
    public Response getById(@PathParam("id") Long id) {
        Category category = categoryRepository.findById(id);
        if (category == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(category).build();
    }

    @POST
    @Transactional
    public Response create(Category category) {
        categoryRepository.persist(category);
        return Response.status(Response.Status.CREATED).entity(category).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public Response update(@PathParam("id") Long id, Category categoryDetails) {
        Category category = categoryRepository.findById(id);
        if (category == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        category.name = categoryDetails.name;
        category.description = categoryDetails.description;
        return Response.ok(category).build();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") Long id) {
        Category category = categoryRepository.findById(id);
        if (category == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        categoryRepository.delete(category);
        return Response.noContent().build();
    }
}
