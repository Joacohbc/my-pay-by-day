package com.mypaybyday.resource;

import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import com.mypaybyday.dto.PagedResponse;
import com.mypaybyday.dto.TagGroupDto;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.TagGroupService;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

@Path("/tag-groups")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Tag Groups", description = "Groups of tags that can be applied together")
public class TagGroupResource {

	private final TagGroupService tagGroupService;

	public TagGroupResource(TagGroupService tagGroupService) {
		this.tagGroupService = tagGroupService;
	}

	@GET
	@Operation(summary = "List tag groups (paginated)")
	@APIResponse(responseCode = "200", description = "Paginated list of tag groups",
			content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = PagedResponse.class)))
	public Response getAll(
			@Parameter(description = "Zero-based page index") @QueryParam("page") @DefaultValue("0") int page,
			@Parameter(description = "Page size") @QueryParam("size") @DefaultValue("20") int size) {
		return Response.ok(tagGroupService.listAll(page, size)).build();
	}

	@GET
	@Path("/{id}")
	@Operation(summary = "Get tag group by ID")
	@APIResponses({
			@APIResponse(responseCode = "200", description = "Tag group found",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TagGroupDto.class))),
			@APIResponse(responseCode = "404", description = "Tag group not found")
	})
	public Response getById(
			@Parameter(description = "ID of the tag group", required = true) @PathParam("id") Long id)
			throws BusinessException {
		return Response.ok(tagGroupService.findById(id)).build();
	}

	@POST
	@Operation(summary = "Create a new tag group")
	@APIResponses({
			@APIResponse(responseCode = "201", description = "Tag group created",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TagGroupDto.class))),
			@APIResponse(responseCode = "400", description = "Validation error")
	})
	public Response create(TagGroupDto tagGroup) throws BusinessException {
		return Response.status(Response.Status.CREATED).entity(tagGroupService.create(tagGroup)).build();
	}

	@PUT
	@Path("/{id}")
	@Operation(summary = "Update a tag group")
	@APIResponses({
			@APIResponse(responseCode = "200", description = "Tag group updated",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TagGroupDto.class))),
			@APIResponse(responseCode = "400", description = "Validation error"),
			@APIResponse(responseCode = "404", description = "Tag group not found")
	})
	public Response update(
			@Parameter(description = "ID of the tag group", required = true) @PathParam("id") Long id,
			TagGroupDto tagGroupDetails) throws BusinessException {
		return Response.ok(tagGroupService.update(id, tagGroupDetails)).build();
	}

	@DELETE
	@Path("/{id}")
	@Operation(summary = "Delete a tag group")
	@APIResponses({
			@APIResponse(responseCode = "204", description = "Tag group deleted"),
			@APIResponse(responseCode = "404", description = "Tag group not found")
	})
	public Response delete(
			@Parameter(description = "ID of the tag group", required = true) @PathParam("id") Long id)
			throws BusinessException {
		tagGroupService.delete(id);
		return Response.noContent().build();
	}
}
