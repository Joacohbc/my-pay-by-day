package com.mypaybyday.dto;

import com.mypaybyday.entity.FileEntity;
import java.util.Base64;

public record FileExportDto(
    Long id,
    String fileName,
    String mimeType,
    long size,
    String base64Content
) {
    public static FileExportDto from(FileEntity file) {
        String base64 = "";
        if (file.data != null) {
            base64 = Base64.getEncoder().encodeToString(file.data);
        }
        return new FileExportDto(
            file.id,
            file.fileName,
            file.mimeType,
            file.size,
            base64
        );
    }
}
