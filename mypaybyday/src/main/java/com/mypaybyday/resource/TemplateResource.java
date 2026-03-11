package com.mypaybyday.resource;

import com.mypaybyday.dto.PagedResponse;
import com.mypaybyday.dto.TemplateDto;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.TemplateService;
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

@Path("/templates")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Templates", description = "Blueprints for rapid Event creation, with optional mathematical modifiers on amounts")
public class TemplateResource {

    @Inject
    TemplateService templateService;

    @GET
    @Operation(summary = "List templates (paginated)")
    @APIResponse(responseCode = "200", description = "Paginated list of templates",
            content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = PagedResponse.class)))
    public Response getAll(
            @Parameter(description = "Zero-based page index") @QueryParam("page") @DefaultValue("0") int page,
            @Parameter(description = "Page size") @QueryParam("size") @DefaultValue("20") int size) {
        return Response.ok(templateService.listAll(page, size)).build();
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Get template by ID")
    @APIResponses({
            @APIResponse(responseCode = "200", description = "Template found",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TemplateDto.class))),
            @APIResponse(responseCode = "404", description = "Template not found")
    })
    public Response getById(
            @Parameter(description = "ID of the template", required = true) @PathParam("id") Long id)
            throws BusinessException {
        return Response.ok(templateService.findById(id)).build();
    }

    @POST
    @Operation(summary = "Create a new template",
            description = "Defines static config (origin/destination nodes, category, tags) and optional dynamic modifiers.")
    @APIResponses({
            @APIResponse(responseCode = "201", description = "Template created",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TemplateDto.class))),
            @APIResponse(responseCode = "400", description = "Validation error")
    })
    public Response create(TemplateDto dto) throws BusinessException {
        return Response.status(Response.Status.CREATED).entity(templateService.create(dto)).build();
    }

    @PATCH
    @Path("/{id}")
    @Operation(summary = "Update a template")
    @APIResponses({
            @APIResponse(responseCode = "200", description = "Template updated",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TemplateDto.class))),
            @APIResponse(responseCode = "400", description = "Validation error"),
            @APIResponse(responseCode = "404", description = "Template not found")
    })
    public Response update(
            @Parameter(description = "ID of the template", required = true) @PathParam("id") Long id,
            TemplateDto dto) throws BusinessException {
        return Response.ok(templateService.update(id, dto)).build();
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Delete a template")
    @APIResponses({
            @APIResponse(responseCode = "204", description = "Template deleted"),
            @APIResponse(responseCode = "400", description = "Template is in use by a subscription"),
            @APIResponse(responseCode = "404", description = "Template not found")
    })
    public Response delete(
            @Parameter(description = "ID of the template", required = true) @PathParam("id") Long id)
            throws BusinessException {
        templateService.delete(id);
        return Response.noContent().build();
    }
}
