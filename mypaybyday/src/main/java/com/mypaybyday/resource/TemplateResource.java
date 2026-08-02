package com.mypaybyday.resource;

import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;

import com.mypaybyday.dto.ErrorResponseDto;
import com.mypaybyday.dto.PagedResponse;
import com.mypaybyday.dto.TemplateDto;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.TemplateService;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.jboss.resteasy.reactive.RestResponse;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

@Path("/templates")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Templates", description = "Blueprints for rapid Event creation, with optional mathematical modifiers on amounts")
public class TemplateResource {

    private final TemplateService templateService;

    public TemplateResource(TemplateService templateService) {
        this.templateService = templateService;
    }

    @GET
    @Operation(summary = "List templates (paginated)")
    @APIResponse(responseCode = "200", description = "Paginated list of templates",
	content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = PagedResponse.class)))
    public RestResponse<PagedResponse<TemplateDto>> getAll(
	@Parameter(description = "Zero-based page index") @QueryParam("page") @DefaultValue("0") int page,
	@Parameter(description = "Page size") @QueryParam("size") @DefaultValue("20") int size) {
	return RestResponse.ok(templateService.listAll(page, size));
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Get template by ID")
    @APIResponses({
	@APIResponse(responseCode = "200", description = "Template found",
		content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TemplateDto.class))),
	@APIResponse(responseCode = "404", description = "Template not found",
			content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
    })
    public RestResponse<TemplateDto> getById(
	@Parameter(description = "ID of the template", required = true) @PathParam("id") Long id)
	throws BusinessException {
	return RestResponse.ok(templateService.findById(id));
    }

    @POST
    @Operation(summary = "Create a new template",
	description = "Defines static config (origin/destination nodes, category, tags) and optional dynamic modifiers.")
    @APIResponses({
	@APIResponse(responseCode = "201", description = "Template created",
		content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TemplateDto.class))),
	@APIResponse(responseCode = "400", description = "Validation error",
			content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
    })
    public RestResponse<TemplateDto> create(TemplateDto dto) throws BusinessException {
	return RestResponse.status(RestResponse.Status.CREATED, templateService.create(dto));
    }

    @PUT
    @Path("/{id}")
    @Operation(summary = "Update a template")
    @APIResponses({
	@APIResponse(responseCode = "200", description = "Template updated",
		content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TemplateDto.class))),
	@APIResponse(responseCode = "400", description = "Validation error",
			content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class))),
	@APIResponse(responseCode = "404", description = "Template not found",
			content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
    })
    public RestResponse<TemplateDto> update(
	@Parameter(description = "ID of the template", required = true) @PathParam("id") Long id,
	TemplateDto dto) throws BusinessException {
	return RestResponse.ok(templateService.update(id, dto));
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Delete a template")
    @APIResponses({
	@APIResponse(responseCode = "204", description = "Template deleted"),
	@APIResponse(responseCode = "400", description = "Template is in use by a subscription",
			content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class))),
	@APIResponse(responseCode = "404", description = "Template not found",
			content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
    })
    public RestResponse<Void> delete(
	@Parameter(description = "ID of the template", required = true) @PathParam("id") Long id)
	throws BusinessException {
	templateService.delete(id);
	return RestResponse.noContent();
    }
}
