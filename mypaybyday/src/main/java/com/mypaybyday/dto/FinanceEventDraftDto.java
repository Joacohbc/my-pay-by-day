package com.mypaybyday.dto;

import java.time.Instant;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinanceEventDraftDto {

    @Schema(description = "The unique identifier of the draft", readOnly = true)
    public Long id;

    @Schema(description = "Optional link to the original event if this draft represents an edit of an existing event")
    public Long originalEventId;

    @Schema(description = "The raw payload json that the frontend maintains to construct the draft")
    public String rawPayloadJson;

    @Schema(description = "Timestamp when the draft was created", readOnly = true)
    public Instant createdAt;

    @Schema(description = "Timestamp when the draft was last updated", readOnly = true)
    public Instant updatedAt;
}
