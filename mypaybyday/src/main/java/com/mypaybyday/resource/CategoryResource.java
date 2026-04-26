package com.mypaybyday.resource;

import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import com.mypaybyday.dto.CategoryDto;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.CategoryService;
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

	private final CategoryService categoryService;

	public CategoryResource(CategoryService categoryService) {
		this.categoryService = categoryService;
	}

	@GET
	@Operation(summary = "List categories")
	@APIResponse(responseCode = "200", description = "List of categories")
	public Response getAll(
			@Parameter(description = "Filter by archived status") @QueryParam("archived") Boolean archived) {
		return Response.ok(categoryService.listAll(archived)).build();
	}

	@GET
	@Path("/{id}")
	@Operation(summary = "Get category by ID")
	@APIResponses({
			@APIResponse(responseCode = "200", description = "Category found",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = CategoryDto.class))),
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
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = CategoryDto.class))),
			@APIResponse(responseCode = "400", description = "Validation error")
	})
	public Response create(CategoryDto category) throws BusinessException {
		return Response.status(Response.Status.CREATED).entity(categoryService.create(category)).build();
	}

	@PUT
	@Path("/{id}")
	@Operation(summary = "Update a category")
	@APIResponses({
			@APIResponse(responseCode = "200", description = "Category updated",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = CategoryDto.class))),
			@APIResponse(responseCode = "400", description = "Validation error"),
			@APIResponse(responseCode = "404", description = "Category not found or archived")
	})
	public Response update(
			@Parameter(description = "ID of the category", required = true) @PathParam("id") Long id,
			CategoryDto categoryDetails) throws BusinessException {
		return Response.ok(categoryService.update(id, categoryDetails)).build();
	}

	@POST
	@Path("/{id}/archive")
	@Operation(summary = "Archive a category")
	@APIResponses({
			@APIResponse(responseCode = "204", description = "Category archived"),
			@APIResponse(responseCode = "404", description = "Category not found")
	})
	public Response archive(
			@Parameter(description = "ID of the category", required = true) @PathParam("id") Long id)
			throws BusinessException {
		categoryService.archive(id);
		return Response.noContent().build();
	}

	@POST
	@Path("/{id}/unarchive")
	@Operation(summary = "Unarchive a category")
	@APIResponses({
			@APIResponse(responseCode = "204", description = "Category unarchived"),
			@APIResponse(responseCode = "404", description = "Category not found")
	})
	public Response unarchive(
			@Parameter(description = "ID of the category", required = true) @PathParam("id") Long id)
			throws BusinessException {
		categoryService.unarchive(id);
		return Response.noContent().build();
	}

	@DELETE
	@Path("/{id}")
	@Operation(summary = "Delete a category")
	@APIResponses({
			@APIResponse(responseCode = "204", description = "Category deleted"),
			@APIResponse(responseCode = "400", description = "Category in use; archive it instead"),
			@APIResponse(responseCode = "404", description = "Category not found")
	})
	public Response delete(
			@Parameter(description = "ID of the category", required = true) @PathParam("id") Long id)
			throws BusinessException {
		categoryService.delete(id);
		return Response.noContent().build();
	}
}
