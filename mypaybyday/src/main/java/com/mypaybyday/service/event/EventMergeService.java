package com.mypaybyday.service.event;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.FinanceLineItemDto;
import com.mypaybyday.dto.MergeEventsRequestDto;
import com.mypaybyday.dto.MergePreviewDto;
import com.mypaybyday.dto.TagDto;
import com.mypaybyday.dto.TagResolveConfig;
import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.entity.FinanceLineItemEntity;
import com.mypaybyday.entity.FinanceNodeEntity;
import com.mypaybyday.entity.FinanceTransactionEntity;
import com.mypaybyday.enums.EntityType;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.EventRepository;
import com.mypaybyday.service.CategoryService;
import com.mypaybyday.service.DraftService;
import com.mypaybyday.service.PaymentPlanService;
import com.mypaybyday.service.TagService;
import io.quarkus.logging.Log;

@ApplicationScoped
public class EventMergeService {

	private final EventRepository eventRepository;
	private final CategoryService categoryService;
	private final TagService tagService;
	private final DraftService entityDraftService;
	private final PaymentPlanService paymentPlanService;
	private final EventMergeComposer composer;
	private final Messages messages;

	public EventMergeService(
			EventRepository eventRepository,
			CategoryService categoryService,
			TagService tagService,
			DraftService entityDraftService,
			PaymentPlanService paymentPlanService,
			EventMergeComposer composer,
			Messages messages) {
		this.eventRepository = eventRepository;
		this.categoryService = categoryService;
		this.tagService = tagService;
		this.entityDraftService = entityDraftService;
		this.paymentPlanService = paymentPlanService;
		this.composer = composer;
		this.messages = messages;
	}

	/**
	 * Works out what merging the sources into the base would produce, persisting nothing.
	 *
	 * @throws BusinessException if the base or a source does not exist, or the request names no
	 *                           sources or the base among them
	 */
	@Transactional
	public MergePreviewDto previewMerge(Long baseEventId, MergeEventsRequestDto request) throws BusinessException {
		FinanceEventEntity baseEvent = findBaseEvent(baseEventId, request);
		return composer.compose(FinanceEventDto.from(baseEvent), toDtos(validateAndFetchRelatedEvents(request.sourceIds)), request);
	}

	/**
	 * Merges the sources into the base event, which keeps its id, date and links, and deletes the
	 * sources. Nothing changes unless the merged event passes every rule the preview checks.
	 *
	 * @throws BusinessException if an event does not exist or the merged event breaks a rule
	 */
	@Transactional
	public FinanceEventDto mergeEvents(Long baseEventId, MergeEventsRequestDto request) throws BusinessException {
		FinanceEventEntity baseEvent = findBaseEvent(baseEventId, request);
		List<FinanceEventEntity> sourceEvents = validateAndFetchRelatedEvents(request.sourceIds);
		MergePreviewDto preview = composer.compose(FinanceEventDto.from(baseEvent), toDtos(sourceEvents), request);
		if (!preview.valid()) {
			throw messages.reject(MsgKey.EVENT_MERGE_INVALID, preview.describeErrors());
		}

		FinanceEventDto mergedEvent = preview.mergedEvent();
		replaceLineItems(baseEvent, sourceEvents, mergedEvent.lineItems());
		baseEvent.name = mergedEvent.name();
		baseEvent.description = mergedEvent.description();
		if (request.categoryId != null) {
			baseEvent.category = categoryService.findEntityById(request.categoryId);
		}
		if (request.tagIds != null) {
			List<TagDto> tagDtos = request.tagIds.stream().map(TagDto::ofId).toList();
			baseEvent.tags = tagService.resolveTags(tagDtos, TagResolveConfig.forNewEntity());
		}
		sourceEvents.forEach(sourceEvent -> baseEvent.files.addAll(sourceEvent.files));

		detachSourcesFromRelatedEvents(sourceEvents);
		paymentPlanService.relinkMergedEvents(baseEventId, request.sourceIds);
		for (FinanceEventEntity sourceEvent : sourceEvents) {
			entityDraftService.deleteByOriginalEntityId(sourceEvent.id, EntityType.FINANCE_EVENT);
			eventRepository.delete(sourceEvent);
		}

		Log.infof("Merged %d events into base id=%d: sources=%s", request.sourceIds.size(), baseEventId, request.sourceIds);
		Long planId = paymentPlanService.findPlanIdsByEventIds(List.of(baseEventId)).get(baseEventId);
		return FinanceEventDto.from(baseEvent).withPaymentPlanId(planId);
	}

	private FinanceEventEntity findBaseEvent(Long baseEventId, MergeEventsRequestDto request) throws BusinessException {
		if (request.sourceIds == null || request.sourceIds.isEmpty()) {
			throw messages.reject(MsgKey.EVENT_MERGE_NO_SOURCES);
		}
		if (request.sourceIds.contains(baseEventId)) {
			throw messages.reject(MsgKey.EVENT_MERGE_SELF);
		}
		FinanceEventEntity baseEvent = eventRepository.findById(baseEventId);
		if (baseEvent == null) {
			throw messages.reject(MsgKey.EVENT_NOT_FOUND);
		}
		return baseEvent;
	}

	private static List<FinanceEventDto> toDtos(List<FinanceEventEntity> events) {
		return events.stream().map(FinanceEventDto::from).toList();
	}

	/**
	 * Swaps the base transaction's line items for the merged ones. Every node they reference
	 * already belongs to one of the merged events, so it is taken from there rather than reloaded.
	 */
	private static void replaceLineItems(FinanceEventEntity baseEvent, List<FinanceEventEntity> sourceEvents,
			List<FinanceLineItemDto> mergedLineItems) {
		Map<Long, FinanceNodeEntity> nodesById = new HashMap<>();
		Stream.concat(Stream.of(baseEvent), sourceEvents.stream())
				.flatMap(event -> event.transaction.lineItems.stream())
				.filter(lineItem -> lineItem.financeNode != null)
				.forEach(lineItem -> nodesById.putIfAbsent(lineItem.financeNode.id, lineItem.financeNode));

		FinanceTransactionEntity baseTransaction = baseEvent.transaction;
		baseTransaction.lineItems.clear();
		for (FinanceLineItemDto mergedLineItem : mergedLineItems) {
			FinanceLineItemEntity lineItem = new FinanceLineItemEntity();
			lineItem.transaction = baseTransaction;
			lineItem.financeNode = nodesById.get(mergedLineItem.financeNodeId());
			lineItem.amount = mergedLineItem.amount();
			lineItem.currency = mergedLineItem.currency();
			baseTransaction.lineItems.add(lineItem);
		}
	}

	private static void detachSourcesFromRelatedEvents(List<FinanceEventEntity> sourceEvents) {
		Set<FinanceEventEntity> sourceEventSet = new HashSet<>(sourceEvents);
		sourceEvents.stream()
				.flatMap(sourceEvent -> sourceEvent.relatedEvents.stream())
				.filter(relatedEvent -> !sourceEventSet.contains(relatedEvent))
				.collect(Collectors.toSet())
				.forEach(relatedEvent -> relatedEvent.relatedEvents.removeAll(sourceEventSet));
		sourceEvents.forEach(sourceEvent -> sourceEvent.relatedEvents.clear());
	}

	@Transactional
	public FinanceEventDto addRelations(Long eventId, List<Long> relatedIds) throws BusinessException {
		FinanceEventEntity event = eventRepository.findById(eventId);
		if (event == null) {
			throw messages.reject(MsgKey.EVENT_NOT_FOUND);
		}

		List<FinanceEventEntity> relatedEvents = validateAndFetchRelatedEvents(relatedIds);
		for (FinanceEventEntity relatedEvent : relatedEvents) {
			if (relatedEvent.id.equals(eventId)) {
				continue;
			}
			event.relatedEvents.add(relatedEvent);
			relatedEvent.relatedEvents.add(event);
		}

		Log.infof("Linked event id=%d related=%s", eventId, relatedIds);
		Long planId = paymentPlanService.findPlanIdsByEventIds(List.of(eventId)).get(eventId);
		return FinanceEventDto.from(event).withPaymentPlanId(planId);
	}

	@Transactional
	public FinanceEventDto removeRelations(Long eventId, List<Long> relatedIds) throws BusinessException {
		FinanceEventEntity event = eventRepository.findById(eventId);
		if (event == null) {
			throw messages.reject(MsgKey.EVENT_NOT_FOUND);
		}

		List<FinanceEventEntity> relatedEvents = validateAndFetchRelatedEvents(relatedIds);
		for (FinanceEventEntity relatedEvent : relatedEvents) {
			if (relatedEvent.id.equals(eventId)) {
				continue;
			}
			event.relatedEvents.remove(relatedEvent);
			relatedEvent.relatedEvents.remove(event);
		}

		Log.infof("Unlinked event id=%d related=%s", eventId, relatedIds);
		Long planId = paymentPlanService.findPlanIdsByEventIds(List.of(eventId)).get(eventId);
		return FinanceEventDto.from(event).withPaymentPlanId(planId);
	}

	@Transactional
	public FinanceEventDto removeRelation(Long eventId, Long relatedId) throws BusinessException {
		return removeRelations(eventId, List.of(relatedId));
	}

	private List<FinanceEventEntity> validateAndFetchRelatedEvents(List<Long> relatedIds) throws BusinessException {
		List<FinanceEventEntity> foundEvents = eventRepository.list("id IN ?1", relatedIds);
		if (foundEvents.size() != relatedIds.size()) {
			throw messages.reject(MsgKey.EVENT_RELATED_NOT_FOUND);
		}
		return foundEvents;
	}
}
