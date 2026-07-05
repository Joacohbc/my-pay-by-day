package com.mypaybyday.dto;

import com.mypaybyday.entity.FileEntity;
import com.mypaybyday.service.FileTypeLabels;

public record FileDto(
	Long id,
	String fileName,
	String mimeType,
	String typeLabel,
	long size,
	boolean isOrphan
) {

	public static FileDto from(FileEntity file) {
		return from(file, false);
	}


	public static FileDto from(FileEntity file, boolean isOrphan) {
		return new FileDto(
			file.id,
			file.fileName,
			file.mimeType,
			FileTypeLabels.labelFor(file.fileName, file.mimeType),
			file.size,
			isOrphan
		);
	}
}
