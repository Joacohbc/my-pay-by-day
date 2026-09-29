package com.mypaybyday.resource;

import java.util.List;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.enums.SchemaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.jboss.resteasy.reactive.RestResponse;

import com.mypaybyday.dto.CurrencyDto;
import com.mypaybyday.dto.ErrorResponseDto;
import com.mypaybyday.dto.UpdateCurrencyDto;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.currency.CurrencyService;

@Path("/currencies")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Currencies", description = "The currencies the user works with and which ones every entry is converted into")
public class CurrencyResource {

	private final CurrencyService currencyService;

	public CurrencyResource(CurrencyService currencyService) {
		this.currencyService = currencyService;
	}

	@GET
	@Operation(summary = "List currencies",
			description = "Every configured currency plus the base currency, with its current quote and whether past "
					+ "entries are still being converted into it.")
	@APIResponse(responseCode = "200", description = "Currencies ordered by code",
			content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(type = SchemaType.ARRAY, implementation = CurrencyDto.class)))
	public RestResponse<List<CurrencyDto>> list() {
		return RestResponse.ok(currencyService.listCurrencies());
	}

	@PUT
	@Path("/{code}")
	@Operation(summary = "Create or update a currency",
			description = "Sets whether the currency is principal. Making it principal requires a quote and queues the "
					+ "conversion of every past entry into it, at the current rate, in the background.")
	@APIResponses({
			@APIResponse(responseCode = "200", description = "Currency saved",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = CurrencyDto.class))),
			@APIResponse(responseCode = "400", description = "Unknown code, or made principal without a quote",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
	})
	public RestResponse<CurrencyDto> update(
			@Parameter(description = "ISO 4217 code", required = true) @PathParam("code") String code,
			UpdateCurrencyDto update) throws BusinessException {
		return RestResponse.ok(currencyService.updateCurrency(code, update));
	}
}
