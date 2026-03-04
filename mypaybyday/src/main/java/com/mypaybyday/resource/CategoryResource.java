package com.mypaybyday.resource;

import com.mypaybyday.entity.Category;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.CategoryService;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/categories")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class CategoryResource {

    @Inject
    CategoryService categoryService;

    @GET
    public Response getAll() {
        return Response.ok(categoryService.listAll()).build();
    }

    @GET
    @Path("/{id}")
    public Response getById(@PathParam("id") Long id) throws BusinessException {
        return Response.ok(categoryService.findById(id)).build();
    }

    @POST
    public Response create(Category category) throws BusinessException {
        return Response.status(Response.Status.CREATED).entity(categoryService.create(category)).build();
    }

    @PUT
    @Path("/{id}")
    public Response update(@PathParam("id") Long id, Category categoryDetails) throws BusinessException {
        return Response.ok(categoryService.update(id, categoryDetails)).build();
    }

    @DELETE
    @Path("/{id}")
    public Response delete(@PathParam("id") Long id) throws BusinessException {
        categoryService.delete(id);
        return Response.noContent().build();
    }
}
