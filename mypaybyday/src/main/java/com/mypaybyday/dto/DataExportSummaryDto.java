package com.mypaybyday.dto;

import java.time.LocalDateTime;
import java.util.List;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(description = "What an export would contain, without serialising any of it")
public record DataExportSummaryDto(
		@Schema(required = true) String version,
		@Schema(required = true) LocalDateTime generatedAt,
		@Schema(required = true) List<SectionCountDto> sections,
		@Schema(required = true, description = "Files carrying binary content, shipped as separate archive entries") long binaryFileCount
) {}
