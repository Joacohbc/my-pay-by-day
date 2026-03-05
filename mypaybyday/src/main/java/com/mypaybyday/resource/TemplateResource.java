package com.mypaybyday.resource;

import com.mypaybyday.entity.Template;
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

    @GET
    @Operation(summary = "List all templates")
    @APIResponse(responseCode = "200", description = "List of templates",
            content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = Template.class)))
    public Response getAll() {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Get template by ID")
    @APIResponses({
            @APIResponse(responseCode = "200", description = "Template found",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = Template.class))),
            @APIResponse(responseCode = "404", description = "Template not found")
    })
    public Response getById(
            @Parameter(description = "ID of the template", required = true) @PathParam("id") Long id) {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    @POST
    @Operation(summary = "Create a new template",
            description = "Defines static config (origin/destination nodes, category, tags) and optional dynamic modifiers.")
    @APIResponses({
            @APIResponse(responseCode = "201", description = "Template created",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = Template.class))),
            @APIResponse(responseCode = "400", description = "Validation error")
    })
    public Response create(Template template) {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    @PUT
    @Path("/{id}")
    @Operation(summary = "Update a template")
    @APIResponses({
            @APIResponse(responseCode = "200", description = "Template updated",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = Template.class))),
            @APIResponse(responseCode = "400", description = "Validation error"),
            @APIResponse(responseCode = "404", description = "Template not found")
    })
    public Response update(
            @Parameter(description = "ID of the template", required = true) @PathParam("id") Long id,
            Template templateDetails) {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Delete a template")
    @APIResponses({
            @APIResponse(responseCode = "204", description = "Template deleted"),
            @APIResponse(responseCode = "404", description = "Template not found")
    })
    public Response delete(
            @Parameter(description = "ID of the template", required = true) @PathParam("id") Long id) {
        throw new UnsupportedOperationException("Not implemented yet");
    }
}
