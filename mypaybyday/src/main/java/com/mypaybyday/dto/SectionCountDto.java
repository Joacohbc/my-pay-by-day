package com.mypaybyday.dto;

import com.mypaybyday.enums.DataSection;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(description = "How many rows one section would contribute to an export")
public record SectionCountDto(
		@Schema(required = true) DataSection section,
		@Schema(required = true) long count
) {}
