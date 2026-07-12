package com.mypaybyday.dto;

import java.util.List;

import com.mypaybyday.entity.FileEntity;
import com.mypaybyday.service.FileTypeLabels;

public record FileWithEventDto(
	Long id,
	String fileName,
	String mimeType,
	String typeLabel,
	long size,
	boolean isOrphan,
	List<EventSummaryDto> events
) {

	public static FileWithEventDto from(FileEntity file, boolean isOrphan, List<EventSummaryDto> events) {
		return new FileWithEventDto(
			file.id,
			file.fileName,
			file.mimeType,
			FileTypeLabels.labelFor(file.fileName, file.mimeType),
			file.size,
			isOrphan,
			events
		);
	}
}
