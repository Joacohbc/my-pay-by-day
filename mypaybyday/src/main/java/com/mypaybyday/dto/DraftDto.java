package com.mypaybyday.dto;

import com.mypaybyday.entity.DraftEntity;
import com.mypaybyday.enums.EntityType;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(description = "An incomplete entity kept as raw UI state, bypassing the strict validations of its typed counterpart")
public record DraftDto(
		@Schema(required = true) Long id,
		@Schema(description = "The entity this draft edits, when it is not a brand-new one") Long originalEntityId,
		@Schema(required = true) EntityType entityType,
		@Schema(required = true) String rawPayloadJson
) {
	public static DraftDto from(DraftEntity entity) {
		if (entity == null) return null;
		return new DraftDto(
				entity.id,
				entity.getOriginalEntityId(),
				entity.getEntityType(),
				entity.getRawPayloadJson());
	}
}
