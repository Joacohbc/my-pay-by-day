package com.mypaybyday.resource;

import com.mypaybyday.dto.RawTextEventRequestDto;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.dto.IntelligentEventResponseDto;
import com.mypaybyday.service.IntelligentEventService;

import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.validation.constraints.NotBlank;
import jakarta.ws.rs.core.Response;

import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

@Path("/events/intelligent")
@Produces(MediaType.APPLICATION_JSON)
@Consumes({MediaType.APPLICATION_JSON, MediaType.TEXT_PLAIN})
@org.eclipse.microprofile.openapi.annotations.tags.Tag(name = "Intelligent Events", description = "AI-powered endpoints for creating events.")
public class IntelligentEventResource {

	private final IntelligentEventService intelligentEventService;

	@Inject
	public IntelligentEventResource(IntelligentEventService intelligentEventService) {
		this.intelligentEventService = intelligentEventService;
	}

	@POST
	@Consumes(MediaType.APPLICATION_JSON)
	@Operation(summary = "Create an event from raw text (JSON)", description = "Uses the AI model to interpret raw text and automatically create the corresponding FinanceEvent (or a Draft if incomplete).")
	@APIResponse(responseCode = "201", description = "Event or Draft successfully created", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = IntelligentEventResponseDto.class)))
	@APIResponse(responseCode = "400", description = "Invalid text or generated event validation failed")
	public Response createFromText(@Valid RawTextEventRequestDto request) throws BusinessException {
		IntelligentEventResponseDto result = intelligentEventService.createFromText(request);
		return Response.status(Response.Status.CREATED).entity(result).build();
	}

	@POST
	@Path("/plain")
	@Consumes(MediaType.TEXT_PLAIN)
	@Operation(summary = "Create an event from plain text", description = "Accepts a plain-text string (no JSON encoding required) and uses the AI model to create the corresponding FinanceEvent (or a Draft if incomplete).")
	@APIResponse(responseCode = "201", description = "Event or Draft successfully created", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = IntelligentEventResponseDto.class)))
	@APIResponse(responseCode = "400", description = "Invalid text or generated event validation failed")
	public Response createFromPlainText(@NotBlank String text) throws BusinessException {
		RawTextEventRequestDto request = new RawTextEventRequestDto();
		request.setText(text);
		IntelligentEventResponseDto result = intelligentEventService.createFromText(request);
		return Response.status(Response.Status.CREATED).entity(result).build();
	}
}
