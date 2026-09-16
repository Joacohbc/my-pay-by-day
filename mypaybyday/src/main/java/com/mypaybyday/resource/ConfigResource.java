package com.mypaybyday.resource;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import com.mypaybyday.dto.ConfigDto;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.jboss.resteasy.reactive.RestResponse;

@Path("/config")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Config", description = "Server-side runtime configuration")
public class ConfigResource {

	@ConfigProperty(name = "mypaybyday.timezone")
	String timezone;

	@ConfigProperty(name = "mypaybyday.default-currency")
	String defaultCurrency;

	@GET
	@Operation(summary = "Get server configuration", description = "Returns server-side configuration the frontend needs to align date/time handling and money entry, such as the server timezone and the default currency")
	@APIResponse(responseCode = "200", description = "Configuration retrieved successfully")
	public RestResponse<ConfigDto> getConfig() {
		return RestResponse.ok(ConfigDto.builder()
				.timezone(timezone)
				.defaultCurrency(defaultCurrency)
				.build());
	}
}
