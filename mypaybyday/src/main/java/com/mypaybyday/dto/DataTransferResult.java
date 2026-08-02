package com.mypaybyday.dto;

import java.util.List;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(description = "Per-section outcome of an import run")
public record DataTransferResult(
		@Schema(required = true) List<SectionImportResult> sections
) {}
