package com.mypaybyday.dto;

import java.time.Instant;
import lombok.Getter;
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
}
