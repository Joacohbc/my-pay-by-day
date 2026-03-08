package com.mypaybyday.dto;

import com.mypaybyday.entity.FinanceEvent;
import com.mypaybyday.enums.EventType;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Minimal read-only projection of a {@link FinanceEvent}.
 *
 * @param id              event identifier
 * @param name            human-readable event name
 * @param description     optional free-text description
 * @param type            directional nature: INBOUND, OUTBOUND, or OTHER
 * @param amount          absolute value of the event transaction (sum of positive line items)
 * @param transactionId   identifier of the underlying transaction
 * @param transactionDate date when the transaction occurred
 * @param lineItems       list of line items involved in the transaction
 * @param category        assigned category, or {@code null} if uncategorised
 * @param tags            tags applied to this event
 */
public record FinanceEventDto(
    Long id,
    String name,
    String description,
    EventType type,
    BigDecimal amount,
    Long transactionId,
    LocalDateTime transactionDate,
    List<FinanceLineItemDto> lineItems,
    CategoryDto category,
    List<TagDto> tags
) {

    public static FinanceEventDto from(FinanceEvent event) {
        // Flatten transaction details if present
        Long txId = null;
        LocalDateTime txDate = null;
        List<FinanceLineItemDto> items = null;
        BigDecimal calculatedAmount = BigDecimal.ZERO;

        if (event.transaction != null) {
            txId = event.transaction.id;
            txDate = event.transaction.transactionDate;
            if (event.transaction.lineItems != null) {
                items = event.transaction.lineItems.stream()
                        .map(FinanceLineItemDto::from)
                        .toList();
                
                // Calculate amount: sum of positive line items
                calculatedAmount = items.stream()
                        .map(FinanceLineItemDto::amount)
                        .filter(a -> a != null && a.compareTo(BigDecimal.ZERO) > 0)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
            } else {
                items = List.of();
            }
        }

        return new FinanceEventDto(
            event.id,
            event.name,
            event.description,
            event.type,
            calculatedAmount,
            txId,
            txDate,
            items,
            event.category != null ? CategoryDto.from(event.category) : null,
            event.tags != null
                ? event.tags.stream().map(TagDto::from).toList()
                : List.of()
        );
    }
}
