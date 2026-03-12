package com.mypaybyday.resource;

import com.mypaybyday.dto.ConfigDto;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.config.inject.ConfigProperty;

@Path("/api/config")
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
