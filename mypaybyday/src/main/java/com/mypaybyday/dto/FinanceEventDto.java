package com.mypaybyday.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.enums.EventType;

/**
 * Minimal read-only projection of a {@link FinanceEventEntity}.
 *
 * @param id              event identifier
 * @param name            human-readable event name
 * @param description     optional free-text description
 * @param type            directional nature: INBOUND, OUTBOUND, or OTHER
 * @param amount          absolute value of the event transaction (sum of positive line items)
 * @param currency        ISO 4217 code denominating {@code amount} and every line item
 * @param transactionId   identifier of the underlying transaction
 * @param transactionDate date when the transaction occurred
 * @param lineItems       list of line items involved in the transaction
 * @param category        assigned category, or {@code null} if uncategorised
 * @param tags            tags applied to this event
 * @param relatedEvents   list of related events
 * @param subscriptionId  identifier of the subscription
 * @param draftId         identifier of the draft event
 * @param paymentPlanId   identifier of the PaymentPlan this event (or draft) is a member of, or {@code null} if unlinked
 * @param conversions     the event's value in each other currency it was converted into, with the rate frozen on it
 */
public record FinanceEventDto(
	Long id,
	String name,
	String description,
	EventType type,
	BigDecimal amount,
	String currency,
	Long transactionId,
	LocalDateTime transactionDate,
	List<FinanceLineItemDto> lineItems,
	CategoryDto category,
	List<TagDto> tags,
	List<RelatedEventDto> relatedEvents,
	Long subscriptionId,
	Long draftId,
	List<FileDto> files,
	Long paymentPlanId,
	List<TransactionConversionDto> conversions
) {

	public FinanceEventDto fromDraft(Long id, Long draftId) {
		return new FinanceEventDto(
			id,
			this.name,
			this.description,
			this.type,
			this.amount,
			this.currency,
			this.transactionId,
			this.transactionDate,
			this.lineItems,
			this.category,
			this.tags,
			this.relatedEvents,
			this.subscriptionId,
			draftId,
			this.files,
			this.paymentPlanId,
			this.conversions
		);
	}

	public FinanceEventDto withPaymentPlanId(Long paymentPlanId) {
		return new FinanceEventDto(
			this.id,
			this.name,
			this.description,
			this.type,
			this.amount,
			this.currency,
			this.transactionId,
			this.transactionDate,
			this.lineItems,
			this.category,
			this.tags,
			this.relatedEvents,
			this.subscriptionId,
			this.draftId,
			this.files,
			paymentPlanId,
			this.conversions
		);
	}


	public static FinanceEventDto from(FinanceEventEntity event) {
		// Flatten transaction details if present
		Long txId = null;
		LocalDateTime txDate = null;
		List<FinanceLineItemDto> items = null;
		BigDecimal calculatedAmount = BigDecimal.ZERO;
		String currency = null;
		List<TransactionConversionDto> conversions = List.of();

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

				currency = FinanceLineItemDto.currencyOf(items);
			} else {
				items = List.of();
			}
			conversions = TransactionConversionDto.fromAll(event.transaction.conversions, calculatedAmount);
		}

		return new FinanceEventDto(
			event.id,
			event.name,
			event.description,
			event.type,
			calculatedAmount,
			currency,
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

			null,

			event.files != null
				? event.files.stream().map(FileDto::from).toList()
				: List.of(),

			null,

			conversions
		);
	}

	/**
	 * This event re-expressed in another currency: its amount and every line item multiplied by
	 * {@code rate}, so aggregations written for a single currency read it unchanged.
	 */
	public FinanceEventDto convertedTo(String targetCurrency, BigDecimal rate) {
		List<FinanceLineItemDto> convertedItems = this.lineItems == null ? List.of() : this.lineItems.stream()
				.map(item -> item.convertedTo(targetCurrency, rate))
				.toList();
		return new FinanceEventDto(
			this.id,
			this.name,
			this.description,
			this.type,
			TransactionConversionDto.convert(this.amount, rate, targetCurrency),
			targetCurrency,
			this.transactionId,
			this.transactionDate,
			convertedItems,
			this.category,
			this.tags,
			this.relatedEvents,
			this.subscriptionId,
			this.draftId,
			this.files,
			this.paymentPlanId,
			this.conversions
		);
	}

}
