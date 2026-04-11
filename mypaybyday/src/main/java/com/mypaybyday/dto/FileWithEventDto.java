package com.mypaybyday.dto;

import com.mypaybyday.entity.FileEntity;
import java.util.List;

public record FileWithEventDto(
	Long id,
	String fileName,
	String mimeType,
	long size,
	boolean isOrphan,
	List<EventSummaryDto> events
) {

	public static FileWithEventDto from(FileEntity file, boolean isOrphan, List<EventSummaryDto> events) {
		return new FileWithEventDto(
			file.id,
			file.fileName,
			file.mimeType,
			file.size,
			isOrphan,
			events
		);
	}
}
