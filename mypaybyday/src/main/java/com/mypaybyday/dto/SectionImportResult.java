package com.mypaybyday.dto;

import java.util.List;

import com.mypaybyday.enums.DataSection;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(description = "Outcome of importing one section of an archive")
public record SectionImportResult(
		@Schema(required = true) DataSection section,
		@Schema(required = true) int imported,
		@Schema(required = true, description = "One localized reason per item the section refused") List<String> skipped
) {
	public static SectionImportResult of(DataSection section, int imported) {
		return new SectionImportResult(section, imported, List.of());
	}

	public static SectionImportResult none(DataSection section) {
		return new SectionImportResult(section, 0, List.of());
	}
}
