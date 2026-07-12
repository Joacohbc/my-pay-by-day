package com.mypaybyday.resource;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import com.mypaybyday.dto.ConfigDto;
import org.eclipse.microprofile.config.inject.ConfigProperty;

@Path("/config")
@Produces(MediaType.APPLICATION_JSON)
public class ConfigResource {

	@ConfigProperty(name = "mypaybyday.timezone")
	String timezone;

	@GET
	public ConfigDto getConfig() {
		return ConfigDto.builder()
				.timezone(timezone)
				.build();
	}
}
