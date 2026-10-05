package com.mypaybyday.resource;

import java.util.List;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
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

import com.mypaybyday.dto.ErrorResponseDto;
import com.mypaybyday.dto.ExchangeRateDto;
import com.mypaybyday.dto.ProviderQuoteDto;
import com.mypaybyday.dto.RecordExchangeRateDto;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.currency.ExchangeRateService;

@Path("/exchange-rates")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Exchange rates", description = "Quotes of every currency against the base currency. A new quote only applies to entries recorded from then on.")
public class ExchangeRateResource {

	private final ExchangeRateService exchangeRateService;

	public ExchangeRateResource(ExchangeRateService exchangeRateService) {
		this.exchangeRateService = exchangeRateService;
	}

	@GET
	@Operation(summary = "List recorded quotes", description = "The history of quotes, newest first.")
	@APIResponses({
			@APIResponse(responseCode = "200", description = "Quotes, newest first",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(type = SchemaType.ARRAY, implementation = ExchangeRateDto.class))),
			@APIResponse(responseCode = "400", description = "Unknown currency code",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
	})
	public RestResponse<List<ExchangeRateDto>> history(
			@Parameter(description = "Only quotes of this ISO 4217 currency") @QueryParam("currency") String currency)
			throws BusinessException {
		return RestResponse.ok(exchangeRateService.listHistory(currency));
	}

	@POST
	@Operation(summary = "Record a quote manually",
			description = "Appends a quote that becomes the currency's current rate. Entries already recorded keep the rate "
					+ "frozen on them.")
	@APIResponses({
			@APIResponse(responseCode = "201", description = "Quote recorded",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ExchangeRateDto.class))),
			@APIResponse(responseCode = "400", description = "Unknown code, the base currency, or a rate that is not positive",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
	})
	public RestResponse<ExchangeRateDto> record(RecordExchangeRateDto quote) throws BusinessException {
		return RestResponse.status(RestResponse.Status.CREATED, exchangeRateService.recordManualRate(quote));
	}

	@GET
	@Path("/provider-quotes")
	@Operation(summary = "Preview the configured provider's quotes",
			description = "Asks the external quote source for every configured currency and returns what it offers right "
					+ "now, without recording anything.")
	@APIResponses({
			@APIResponse(responseCode = "200", description = "Quotes the provider offers, against the current base currency",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(type = SchemaType.ARRAY, implementation = ProviderQuoteDto.class))),
			@APIResponse(responseCode = "400", description = "No provider is configured, it cannot quote against the base currency, or it failed",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
	})
	public RestResponse<List<ProviderQuoteDto>> providerQuotes() throws BusinessException {
		return RestResponse.ok(exchangeRateService.previewProviderQuotes());
	}

	@POST
	@Path("/refresh")
	@Operation(summary = "Fetch quotes from the configured provider",
			description = "Asks the external quote source for every configured currency and records what it returns. "
					+ "Never runs on its own.")
	@APIResponses({
			@APIResponse(responseCode = "200", description = "Quotes recorded",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(type = SchemaType.ARRAY, implementation = ExchangeRateDto.class))),
			@APIResponse(responseCode = "400", description = "No provider is configured, it cannot quote against the base currency, or it failed",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
	})
	public RestResponse<List<ExchangeRateDto>> refresh() throws BusinessException {
		return RestResponse.ok(exchangeRateService.refreshFromProvider());
	}

}
