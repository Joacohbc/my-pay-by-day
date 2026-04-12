package com.mypaybyday.config;

import jakarta.inject.Singleton;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.jackson.ObjectMapperCustomizer;
import org.openapitools.jackson.nullable.JsonNullableModule;

@Singleton
public class JacksonConfig implements ObjectMapperCustomizer {

	@Override
	public void customize(ObjectMapper mapper) {
		mapper.registerModule(new JsonNullableModule());
	}
}
