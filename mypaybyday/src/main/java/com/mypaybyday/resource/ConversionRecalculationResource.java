package com.mypaybyday.resource;

import java.util.List;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.enums.SchemaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.jboss.resteasy.reactive.RestResponse;

import com.mypaybyday.dto.ConversionRecalculationDto;
import com.mypaybyday.dto.ErrorResponseDto;
import com.mypaybyday.dto.RequestConversionRecalculationDto;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.currency.ConversionRecalculationService;

@Path("/conversion-recalculations")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Conversion recalculations", description = "Re-price past entries with a chosen rate, in the background")
public class ConversionRecalculationResource {

	private final ConversionRecalculationService conversionRecalculationService;

	public ConversionRecalculationResource(ConversionRecalculationService conversionRecalculationService) {
		this.conversionRecalculationService = conversionRecalculationService;
	}

	@GET
	@Operation(summary = "List recent recalculations", description = "The most recent recalculations, newest first, with their progress.")
	@APIResponse(responseCode = "200", description = "Recalculations, newest first",
			content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(type = SchemaType.ARRAY, implementation = ConversionRecalculationDto.class)))
	public RestResponse<List<ConversionRecalculationDto>> list() {
		return RestResponse.ok(conversionRecalculationService.listRecent());
	}

	@POST
	@Operation(summary = "Recalculate past conversions",
			description = "Queues a background job that gives every entry recorded in the source currency, optionally "
					+ "within a date range, the chosen rate into the target principal currency, replacing the rate frozen "
					+ "on it. Quotes are not changed.")
	@APIResponses({
			@APIResponse(responseCode = "201", description = "Recalculation queued",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ConversionRecalculationDto.class))),
			@APIResponse(responseCode = "400", description = "Unknown or equal currencies, a target that is not principal, "
					+ "a rate that is not positive, or a date range that ends before it starts",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
	})
	public RestResponse<ConversionRecalculationDto> request(RequestConversionRecalculationDto request) throws BusinessException {
		return RestResponse.status(RestResponse.Status.CREATED, conversionRecalculationService.request(request));
	}
}
