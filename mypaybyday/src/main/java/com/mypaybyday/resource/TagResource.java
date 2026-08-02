package com.mypaybyday.resource;

import java.util.List;

import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;

import com.mypaybyday.dto.ErrorResponseDto;
import com.mypaybyday.dto.TagDto;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.TagService;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.jboss.resteasy.reactive.RestResponse;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

@Path("/tags")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Tags", description = "Transversal labels (e.g. #Vacation2026) that can be applied to Events for cross-cutting reporting")
public class TagResource {

	private final TagService tagService;

	public TagResource(TagService tagService) {
		this.tagService = tagService;
	}

	@GET
	@Operation(summary = "List tags")
	@APIResponse(responseCode = "200", description = "List of tags")
	public RestResponse<List<TagDto>> getAll(
			@Parameter(description = "Filter by archived status") @QueryParam("archived") Boolean archived) {
		return RestResponse.ok(tagService.listAll(archived));
	}

	@GET
	@Path("/{id}")
	@Operation(summary = "Get tag by ID")
	@APIResponses({
			@APIResponse(responseCode = "200", description = "Tag found",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TagDto.class))),
			@APIResponse(responseCode = "404", description = "Tag not found",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
	})
	public RestResponse<TagDto> getById(
			@Parameter(description = "ID of the tag", required = true) @PathParam("id") Long id)
			throws BusinessException {
		return RestResponse.ok(tagService.findById(id));
	}

	@POST
	@Operation(summary = "Create a new tag")
	@APIResponses({
			@APIResponse(responseCode = "201", description = "Tag created",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TagDto.class))),
			@APIResponse(responseCode = "400", description = "Validation error",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
	})
	public RestResponse<TagDto> create(TagDto tag) throws BusinessException {
		return RestResponse.status(RestResponse.Status.CREATED, tagService.create(tag));
	}

	@PUT
	@Path("/{id}")
	@Operation(summary = "Update a tag")
	@APIResponses({
			@APIResponse(responseCode = "200", description = "Tag updated",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TagDto.class))),
			@APIResponse(responseCode = "400", description = "Validation error",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class))),
			@APIResponse(responseCode = "404", description = "Tag not found or archived",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
	})
	public RestResponse<TagDto> update(
			@Parameter(description = "ID of the tag", required = true) @PathParam("id") Long id,
			TagDto tagDetails) throws BusinessException {
		return RestResponse.ok(tagService.update(id, tagDetails));
	}

	@POST
	@Path("/{id}/archive")
	@Operation(summary = "Archive a tag")
	@APIResponses({
			@APIResponse(responseCode = "204", description = "Tag archived"),
			@APIResponse(responseCode = "404", description = "Tag not found",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class))),
			@APIResponse(responseCode = "409", description = "Tag still used by templates or subscriptions",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
	})
	public RestResponse<Void> archive(
			@Parameter(description = "ID of the tag", required = true) @PathParam("id") Long id)
			throws BusinessException {
		tagService.archive(id);
		return RestResponse.noContent();
	}

	@POST
	@Path("/{id}/unarchive")
	@Operation(summary = "Unarchive a tag")
	@APIResponses({
			@APIResponse(responseCode = "204", description = "Tag unarchived"),
			@APIResponse(responseCode = "404", description = "Tag not found",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
	})
	public RestResponse<Void> unarchive(
			@Parameter(description = "ID of the tag", required = true) @PathParam("id") Long id)
			throws BusinessException {
		tagService.unarchive(id);
		return RestResponse.noContent();
	}

	@DELETE
	@Path("/{id}")
	@Operation(summary = "Delete a tag")
	@APIResponses({
			@APIResponse(responseCode = "204", description = "Tag deleted"),
			@APIResponse(responseCode = "404", description = "Tag not found",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class))),
			@APIResponse(responseCode = "409", description = "Tag in use; archive it instead",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
	})
	public RestResponse<Void> delete(
			@Parameter(description = "ID of the tag", required = true) @PathParam("id") Long id)
			throws BusinessException {
		tagService.delete(id);
		return RestResponse.noContent();
	}
}
