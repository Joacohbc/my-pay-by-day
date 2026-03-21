package com.mypaybyday.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * An entity that represents an incomplete or draft state of a FinanceEvent.
 *
 * <p>
 * This entity deliberately avoids the strict validations of {@link FinanceEvent} and its
 * related {@link FinanceTransaction} (which enforce the Zero-Sum Rule). The draft state
 * is kept entirely as a raw JSON string to support any intermediate frontend state.
 */
@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "finance_event_draft")
public class FinanceEventDraft extends BaseEntity {

    /**
     * Optional link to the original event if this draft represents an edit of a pre-existing
     * finalized event.
     */
    public Long originalEventId;

    /**
     * The raw UI state representing the draft. This bypasses the strict accounting engine.
     */
    @Column(columnDefinition = "TEXT")
    public String rawPayloadJson;

    @Override
    public String toRagContent() {
        return "Draft event payload: " + rawPayloadJson;
    }
}
