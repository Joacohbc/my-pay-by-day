package com.mypaybyday.resource;

import com.mypaybyday.entity.Category;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.CategoryService;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

@Path("/categories")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Categories", description = "Budget classification buckets assigned to Events")
public class CategoryResource {

    @Inject
    CategoryService categoryService;

    @GET
    @Operation(summary = "List all categories")
    @APIResponse(responseCode = "200", description = "List of categories",
            content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = Category.class)))
    public Response getAll() {
        return Response.ok(categoryService.listAll()).build();
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Get category by ID")
    @APIResponses({
            @APIResponse(responseCode = "200", description = "Category found",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = Category.class))),
            @APIResponse(responseCode = "404", description = "Category not found")
    })
    public Response getById(
            @Parameter(description = "ID of the category", required = true) @PathParam("id") Long id)
            throws BusinessException {
        return Response.ok(categoryService.findById(id)).build();
    }

    @POST
    @Operation(summary = "Create a new category", description = "Category name must not be blank.")
    @APIResponses({
            @APIResponse(responseCode = "201", description = "Category created",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = Category.class))),
            @APIResponse(responseCode = "400", description = "Validation error")
    })
    public Response create(Category category) throws BusinessException {
        return Response.status(Response.Status.CREATED).entity(categoryService.create(category)).build();
    }

    @PUT
    @Path("/{id}")
    @Operation(summary = "Update a category")
    @APIResponses({
            @APIResponse(responseCode = "200", description = "Category updated",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = Category.class))),
            @APIResponse(responseCode = "400", description = "Validation error"),
            @APIResponse(responseCode = "404", description = "Category not found")
    })
    public Response update(
            @Parameter(description = "ID of the category", required = true) @PathParam("id") Long id,
            Category categoryDetails) throws BusinessException {
        return Response.ok(categoryService.update(id, categoryDetails)).build();
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Delete a category")
    @APIResponses({
            @APIResponse(responseCode = "204", description = "Category deleted"),
            @APIResponse(responseCode = "404", description = "Category not found")
    })
    public Response delete(
            @Parameter(description = "ID of the category", required = true) @PathParam("id") Long id)
            throws BusinessException {
        categoryService.delete(id);
        return Response.noContent().build();
    }
}
