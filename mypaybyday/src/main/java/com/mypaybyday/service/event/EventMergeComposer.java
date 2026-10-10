package com.mypaybyday.service.event;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.dto.CategoryDto;
import com.mypaybyday.dto.FileDto;
import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.FinanceLineItemDto;
import com.mypaybyday.dto.MergeEventsRequestDto;
import com.mypaybyday.dto.MergePreviewDto;
import com.mypaybyday.dto.TagDto;
import com.mypaybyday.dto.ValidationErrorDto;
import com.mypaybyday.enums.EventType;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.validation.TransactionValidator;

/**
 * Works out the single event a merge would leave behind and every rule it would break, without
 * touching the database. Events and drafts both reach it as {@link FinanceEventDto}, so merging
 * either one follows the same rules and shows the user the same preview.
 */
@ApplicationScoped
public class EventMergeComposer {

	/**
	 * Groups line items that a merge should collapse into one. Two movements only cancel or
	 * accumulate when they touch the same node <em>and</em> are denominated the same way, so the
	 * currency is part of the identity rather than a detail carried along with it.
	 */
	private record NodeCurrency(Long nodeId, String currency) {
	}

	private static final EventType DEFAULT_EVENT_TYPE = EventType.OUTBOUND;

	private final TransactionValidator transactionValidator;
	private final Messages messages;

	public EventMergeComposer(TransactionValidator transactionValidator, Messages messages) {
		this.transactionValidator = transactionValidator;
		this.messages = messages;
	}

	/**
	 * @param base    the event (or draft) the others are merged into; it supplies the date, the type
	 *                and every field the options leave unset
	 * @param sources the events (or drafts) absorbed into the base
	 * @param options how to group line items and what to name, categorise and tag the result
	 * @return the merged event together with every rule it breaks
	 */
	public MergePreviewDto compose(FinanceEventDto base, List<FinanceEventDto> sources, MergeEventsRequestDto options) {
		List<FinanceEventDto> sourcesByDate = sources.stream()
				.sorted(Comparator.comparing(FinanceEventDto::transactionDate,
						Comparator.nullsLast(Comparator.<LocalDateTime>naturalOrder())))
				.toList();
		FinanceEventDto mergedEvent = buildMergedEvent(base, sourcesByDate, options);
		List<ValidationErrorDto> errors = findErrors(base, sources, mergedEvent);
		return new MergePreviewDto(errors.isEmpty(), errors, mergedEvent);
	}

	private List<ValidationErrorDto> findErrors(FinanceEventDto base, List<FinanceEventDto> sources,
			FinanceEventDto mergedEvent) {
		List<ValidationErrorDto> errors = new ArrayList<>();
		boolean mixesEventTypes = sources.stream().anyMatch(source -> typeOf(source) != typeOf(base));
		if (mixesEventTypes) {
			errors.add(new ValidationErrorDto(ValidationErrorDto.TYPE_FIELD, messages.get(MsgKey.EVENT_MERGE_MIXED_TYPES)));
		}
		if (!hasText(mergedEvent.name())) {
			errors.add(new ValidationErrorDto(ValidationErrorDto.NAME_FIELD, messages.get(MsgKey.EVENT_MERGE_MISSING_NAME)));
		}
		errors.addAll(transactionValidator.findViolations(TransientFinanceEvent.from(mergedEvent).transaction));
		return errors;
	}

	private FinanceEventDto buildMergedEvent(FinanceEventDto base, List<FinanceEventDto> sourcesByDate,
			MergeEventsRequestDto options) {
		List<FinanceEventDto> mergedEvents = Stream.concat(Stream.of(base), sourcesByDate.stream()).toList();
		List<FinanceLineItemDto> lineItems = combineLineItems(
				mergedEvents.stream().flatMap(event -> lineItemsOf(event).stream()).toList(),
				options.groupByNodeIds != null ? new HashSet<>(options.groupByNodeIds) : new HashSet<>());

		return new FinanceEventDto(
				base.id(),
				hasText(options.name) ? options.name.trim() : base.name(),
				hasText(options.description) ? options.description.trim() : base.description(),
				typeOf(base),
				sumOfInflows(lineItems),
				FinanceLineItemDto.currencyOf(lineItems),
				base.transactionId(),
				base.transactionDate(),
				lineItems,
				options.categoryId != null ? findCategory(mergedEvents, options.categoryId) : base.category(),
				options.tagIds != null ? findTags(mergedEvents, options.tagIds) : base.tags(),
				base.relatedEvents(),
				base.subscriptionId(),
				base.draftId(),
				distinctFiles(mergedEvents),
				base.paymentPlanId(),
				List.of());
	}

	/**
	 * Sums the line items of every grouped node per currency and keeps the rest one by one,
	 * outflows first. A line item with no amount is never summed, so the zero-sum rule still
	 * reports it.
	 */
	static List<FinanceLineItemDto> combineLineItems(List<FinanceLineItemDto> lineItems, Set<Long> groupedNodeIds) {
		Map<NodeCurrency, FinanceLineItemDto> groupedByNodeCurrency = new LinkedHashMap<>();
		List<FinanceLineItemDto> combined = new ArrayList<>();
		for (FinanceLineItemDto lineItem : lineItems) {
			boolean isSummed = lineItem.amount() != null && groupedNodeIds.contains(lineItem.financeNodeId());
			if (!isSummed) {
				combined.add(lineItem);
				continue;
			}
			groupedByNodeCurrency.merge(new NodeCurrency(lineItem.financeNodeId(), lineItem.currency()), lineItem,
					EventMergeComposer::addAmounts);
		}
		combined.addAll(0, groupedByNodeCurrency.values());
		combined.sort(EventMergeComposer::compareMergedLineItems);
		return combined;
	}

	private static FinanceLineItemDto addAmounts(FinanceLineItemDto accumulated, FinanceLineItemDto next) {
		return new FinanceLineItemDto(accumulated.financeNodeId(), accumulated.financeNodeName(),
				accumulated.financeNodeIcon(), accumulated.amount().add(next.amount()), accumulated.currency());
	}

	private static int compareMergedLineItems(FinanceLineItemDto first, FinanceLineItemDto second) {
		boolean isFirstOutflow = isNegative(first.amount());
		boolean isSecondOutflow = isNegative(second.amount());
		if (isFirstOutflow != isSecondOutflow) {
			return isFirstOutflow ? -1 : 1;
		}
		if (isFirstOutflow) {
			int amountComparison = second.amount().compareTo(first.amount());
			if (amountComparison != 0) {
				return amountComparison;
			}
		}
		return Comparator.nullsLast(Comparator.<Long>naturalOrder())
				.compare(first.financeNodeId(), second.financeNodeId());
	}

	private static boolean isNegative(BigDecimal amount) {
		return amount != null && amount.signum() < 0;
	}

	private static BigDecimal sumOfInflows(List<FinanceLineItemDto> lineItems) {
		return lineItems.stream()
				.map(FinanceLineItemDto::amount)
				.filter(amount -> amount != null && amount.signum() > 0)
				.reduce(BigDecimal.ZERO, BigDecimal::add);
	}

	private static CategoryDto findCategory(List<FinanceEventDto> mergedEvents, Long categoryId) {
		return mergedEvents.stream()
				.map(FinanceEventDto::category)
				.filter(category -> category != null && categoryId.equals(category.id()))
				.findFirst()
				.orElse(new CategoryDto(categoryId, null, null, null, null, false));
	}

	private static List<TagDto> findTags(List<FinanceEventDto> mergedEvents, List<Long> tagIds) {
		Map<Long, TagDto> knownTags = mergedEvents.stream()
				.flatMap(event -> event.tags() != null ? event.tags().stream() : Stream.empty())
				.filter(tag -> tag.id() != null)
				.collect(Collectors.toMap(TagDto::id, Function.identity(), (first, second) -> first));
		return tagIds.stream().map(tagId -> knownTags.getOrDefault(tagId, TagDto.ofId(tagId))).toList();
	}

	private static List<FileDto> distinctFiles(List<FinanceEventDto> mergedEvents) {
		return mergedEvents.stream()
				.flatMap(event -> event.files() != null ? event.files().stream() : Stream.empty())
				.filter(file -> file.id() != null)
				.collect(Collectors.toMap(FileDto::id, Function.identity(), (first, second) -> first, LinkedHashMap::new))
				.values().stream().toList();
	}

	private static List<FinanceLineItemDto> lineItemsOf(FinanceEventDto event) {
		return event.lineItems() != null ? event.lineItems() : List.of();
	}

	private static EventType typeOf(FinanceEventDto event) {
		return Objects.requireNonNullElse(event.type(), DEFAULT_EVENT_TYPE);
	}

	private static boolean hasText(String text) {
		return text != null && !text.isBlank();
	}
}
