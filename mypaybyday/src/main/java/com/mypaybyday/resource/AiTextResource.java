package com.mypaybyday.resource;

import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import com.mypaybyday.dto.AiTextRequestDto;
import com.mypaybyday.dto.AiTextResponseDto;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.AiTextService;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

@Path("/ai/text")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@org.eclipse.microprofile.openapi.annotations.tags.Tag(name = "AI Text", description = "AI-powered text generation for form fields.")
public class AiTextResource {

    private final AiTextService aiTextService;

    @Inject
    public AiTextResource(AiTextService aiTextService) {
        this.aiTextService = aiTextService;
    }

    @POST
    @Operation(
        summary = "Generate or fix text with AI",
        description = "Generates or corrects a name/description field using AI. Accepts a context, the current value, and an optional custom prompt from settings."
    )
    @APIResponse(responseCode = "200", description = "Text generated successfully",
        content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = AiTextResponseDto.class)))
    @APIResponse(responseCode = "400", description = "Invalid request or AI generation failed")
    public Response generate(@Valid AiTextRequestDto request) throws BusinessException {
        AiTextResponseDto result = aiTextService.generate(request);
        return Response.ok(result).build();
    }
}
