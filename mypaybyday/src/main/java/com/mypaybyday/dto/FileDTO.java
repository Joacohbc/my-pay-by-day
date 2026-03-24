package com.mypaybyday.dto;

import java.time.Instant;
import lombok.Getter;
import com.mypaybyday.entity.StoredFile;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class FileDTO {
    private Long id;
    private String fileName;
    private String contentType;
    private Instant createdAt;

    public static FileDTO from(StoredFile storedFile) {
        if (storedFile == null) {
            return null;
        }
        FileDTO dto = new FileDTO();
        dto.setId(storedFile.id);
        dto.setFileName(storedFile.getFileName());
        dto.setContentType(storedFile.getContentType());
        dto.setCreatedAt(storedFile.createdAt);
        return dto;
    }
}
