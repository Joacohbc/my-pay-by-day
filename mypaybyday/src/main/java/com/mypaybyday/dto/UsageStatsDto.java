package com.mypaybyday.dto;

import java.time.Instant;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(description = "Statistics about entity usage and selection frequency")
public record UsageStatsDto(
		@Schema(description = "ID of the entity")
		Long entityId,

		@Schema(description = "Number of times the entity is referenced in the domain (events/line items)")
		long domainUsageCount,

		@Schema(description = "Number of times the entity was manually selected in the UI")
		long selectionCount,

		@Schema(description = "Timestamp of the last UI selection")
		Instant lastSelectedAt) {
}
