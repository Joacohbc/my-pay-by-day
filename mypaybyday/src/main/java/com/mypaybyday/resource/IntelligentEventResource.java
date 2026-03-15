package com.mypaybyday.resource;

import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.RawTextEventRequestDto;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.IntelligentEventService;

import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

@Path("/events/intelligent")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@org.eclipse.microprofile.openapi.annotations.tags.Tag(name = "Intelligent Events", description = "AI-powered endpoints for creating events.")
public class IntelligentEventResource {

    @Inject
    IntelligentEventService intelligentEventService;

    @POST
    @Operation(summary = "Create an event from raw text", description = "Uses the AI model and RAG to interpret raw text and automatically create the corresponding FinanceEvent.")
    @APIResponse(responseCode = "201", description = "Event successfully created", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = FinanceEventDto.class)))
    @APIResponse(responseCode = "400", description = "Invalid text or generated event validation failed")
    public Response createFromText(@Valid RawTextEventRequestDto request) throws BusinessException {
        FinanceEventDto createdEvent = intelligentEventService.createFromText(request);
        return Response.status(Response.Status.CREATED).entity(createdEvent).build();
    }
}
