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
 * @param relatedEvents   list of related events
 * @param subscriptionId  identifier of the subscription
 * @param draftId         identifier of the draft event
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
    List<TagDto> tags,
    List<RelatedEventDto> relatedEvents,
    Long subscriptionId,
<<<<<<< HEAD
    Long draftId,
    List<FileDTO> files,
    List<Long> fileIds
=======
    Long draftId
>>>>>>> origin/master
) {
    public FinanceEventDto fromDraft(Long id, Long draftId) {
        return new FinanceEventDto(
            id,
            this.name,
            this.description,
            this.type,
            this.amount,
            this.transactionId,
            this.transactionDate,
            this.lineItems,
            this.category,
            this.tags,
            this.relatedEvents,
            this.subscriptionId,
<<<<<<< HEAD
            draftId,
            this.files,
            this.fileIds
=======
            draftId
>>>>>>> origin/master
        );
    }
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
                : List.of(),

            event.relatedEvents != null
                ? event.relatedEvents.stream().map(RelatedEventDto::from).toList()
                : List.of(),

            event.subscription != null ? event.subscription.id : null,

<<<<<<< HEAD
            null,

            event.files != null
                ? event.files.stream().map(FileDTO::from).toList()
                : List.of(),

            event.files != null
                ? event.files.stream().map(f -> f.id).toList()
                : List.of()
=======
            null
>>>>>>> origin/master
        );
    }
}
