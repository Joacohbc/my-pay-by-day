package com.mypaybyday.dto;

import com.mypaybyday.entity.FinanceEvent;
import com.mypaybyday.enums.EventType;

import java.util.List;

/**
 * Minimal read-only projection of a {@link FinanceEvent}.
 *
 * @param id          event identifier
 * @param name        human-readable event name
 * @param description optional free-text description
 * @param type        directional nature: INBOUND, OUTBOUND, or OTHER
 * @param transaction full transaction with date and line items
 * @param category    assigned category, or {@code null} if uncategorised
 * @param tags        tags applied to this event
 */
public record FinanceEventDto(
        Long id,
        String name,
        String description,
        EventType type,
        FinanceTransactionDto transaction,
        CategoryDto category,
        List<TagDto> tags
) {

    public static FinanceEventDto from(FinanceEvent event) {
        return new FinanceEventDto(
                event.id,
                event.name,
                event.description,
                event.type,
                event.transaction != null ? FinanceTransactionDto.from(event.transaction) : null,
                event.category != null ? CategoryDto.from(event.category) : null,
                event.tags != null
                        ? event.tags.stream().map(TagDto::from).toList()
                        : List.of()
        );
    }
}
