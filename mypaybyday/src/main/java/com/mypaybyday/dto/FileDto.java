package com.mypaybyday.dto;

import com.mypaybyday.entity.FileEntity;

public record FileDto(
    Long id,
    String fileName,
    String mimeType,
    long size,
    boolean isOrphan
) {
    public static FileDto from(FileEntity file) {
        return new FileDto(
            file.id,
            file.fileName,
            file.mimeType,
            file.size,
            false
        );
    }

    public static FileDto from(FileEntity file, boolean isOrphan) {
        return new FileDto(
            file.id,
            file.fileName,
            file.mimeType,
            file.size,
            isOrphan
        );
    }
}
