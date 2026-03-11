package com.mypaybyday.resource;

import com.mypaybyday.dto.TagDto;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.TagService;
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

@Path("/tags")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Tags", description = "Transversal labels (e.g. #Vacation2026) that can be applied to Events for cross-cutting reporting")
public class TagResource {

    @Inject
    TagService tagService;

    @GET
    @Operation(summary = "List all tags")
    @APIResponse(responseCode = "200", description = "List of tags",
            content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TagDto.class)))
    public Response getAll() {
        return Response.ok(tagService.listAll()).build();
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Get tag by ID")
    @APIResponses({
            @APIResponse(responseCode = "200", description = "Tag found",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TagDto.class))),
            @APIResponse(responseCode = "404", description = "Tag not found")
    })
    public Response getById(
            @Parameter(description = "ID of the tag", required = true) @PathParam("id") Long id)
            throws BusinessException {
        return Response.ok(tagService.findById(id)).build();
    }

    @POST
    @Operation(summary = "Create a new tag")
    @APIResponses({
            @APIResponse(responseCode = "201", description = "Tag created",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TagDto.class))),
            @APIResponse(responseCode = "400", description = "Validation error")
    })
    public Response create(TagDto tag) throws BusinessException {
        return Response.status(Response.Status.CREATED).entity(tagService.create(tag)).build();
    }

    @PATCH
    @Path("/{id}")
    @Operation(summary = "Update a tag")
    @APIResponses({
            @APIResponse(responseCode = "200", description = "Tag updated",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TagDto.class))),
            @APIResponse(responseCode = "400", description = "Validation error"),
            @APIResponse(responseCode = "404", description = "Tag not found")
    })
    public Response update(
            @Parameter(description = "ID of the tag", required = true) @PathParam("id") Long id,
            TagDto tagDetails) throws BusinessException {
        return Response.ok(tagService.update(id, tagDetails)).build();
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Delete a tag")
    @APIResponses({
            @APIResponse(responseCode = "204", description = "Tag deleted"),
            @APIResponse(responseCode = "404", description = "Tag not found")
    })
    public Response delete(
            @Parameter(description = "ID of the tag", required = true) @PathParam("id") Long id)
            throws BusinessException {
        tagService.delete(id);
        return Response.noContent().build();
    }
}
