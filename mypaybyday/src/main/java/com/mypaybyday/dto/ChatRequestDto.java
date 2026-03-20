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

    private String image; // Contains base64 data url like data:image/jpeg;base64,...
}
