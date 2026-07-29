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

	@GET
	@Operation(summary = "Get server configuration", description = "Returns server-side configuration the frontend needs to align date/time handling, such as the server timezone")
	@APIResponse(responseCode = "200", description = "Configuration retrieved successfully")
	public RestResponse<ConfigDto> getConfig() {
		return RestResponse.ok(ConfigDto.builder()
				.timezone(timezone)
				.build());
	}
}
