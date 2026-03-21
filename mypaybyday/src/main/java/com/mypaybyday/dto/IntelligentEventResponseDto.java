package com.mypaybyday.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IntelligentEventResponseDto {

    public enum ResponseType {
        EVENT, DRAFT
    }

    @Schema(description = "Indicates if the result is a finalized Event or a work-in-progress Draft")
    private ResponseType type;

    @Schema(description = "The created event (if type is EVENT)")
    private FinanceEventDto event;
}
