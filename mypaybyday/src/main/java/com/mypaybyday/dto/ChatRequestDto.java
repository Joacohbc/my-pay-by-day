package com.mypaybyday.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatRequestDto {
    @NotBlank
    private String chatId;

    @NotBlank
    private String message;

    /**
     * Chat mode: "query" for read-only queries (default), "agent" for creating events/drafts.
     * When null or blank, defaults to "query".
     */
    private String mode;
}
