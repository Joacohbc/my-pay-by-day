package com.mypaybyday.dto;

import com.mypaybyday.enums.EntityType;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(description = "Payload to record a UI selection event")
public record RecordSelectionDto(
		@Schema(description = "Type of the entity being selected", required = true)
		EntityType entityType,

		@Schema(description = "ID of the entity being selected", required = true)
		Long entityId) {
}
