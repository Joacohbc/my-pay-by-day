package com.mypaybyday.dto;

import com.mypaybyday.entity.FinanceEvent;
import com.mypaybyday.enums.EventType;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Minimal read-only projection of a {@link FinanceEvent}.
 *
 * @param id              event identifier
 * @param name            human-readable event name
 * @param description     optional free-text description
 * @param type            directional nature: INBOUND, OUTBOUND, or OTHER
 * @param transactionDate date and time the financial movement occurred
 * @param category        assigned category, or {@code null} if uncategorised
 * @param tags            tags applied to this event
 */
public record FinanceEventDto(
        Long id,
        Long transactionId,
        String name,
        String description,
        EventType type,
        LocalDateTime transactionDate,
        List<FinanceLineItemDto> lineItems,
        CategoryDto category,
        List<TagDto> tags
) {

    public static FinanceEventDto from(FinanceEvent event) {
        return new FinanceEventDto(
                event.id,
                event.transaction != null ? event.transaction.id : null,
                event.name,
                event.description,
                event.type,
                event.transaction != null ? event.transaction.transactionDate : null,
                event.transaction != null && event.transaction.lineItems != null
                        ? event.transaction.lineItems.stream().map(FinanceLineItemDto::from).toList()
                        : List.of(),
                event.category != null ? CategoryDto.from(event.category) : null,
                event.tags != null
                        ? event.tags.stream().map(TagDto::from).toList()
                        : List.of()
        );
    }
}
