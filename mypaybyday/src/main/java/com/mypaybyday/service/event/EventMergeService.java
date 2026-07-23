package com.mypaybyday.service.event;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.FinanceEventDto;
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
import com.mypaybyday.service.TagService;
import io.quarkus.logging.Log;

@ApplicationScoped
public class EventMergeService {

	private final EventRepository eventRepository;
	private final CategoryService categoryService;
	private final TagService tagService;
	private final DraftService entityDraftService;
	private final Messages messages;

	public EventMergeService(
			EventRepository eventRepository,
			CategoryService categoryService,
			TagService tagService,
			DraftService entityDraftService,
			Messages messages) {
		this.eventRepository = eventRepository;
		this.categoryService = categoryService;
		this.tagService = tagService;
		this.entityDraftService = entityDraftService;
		this.messages = messages;
	}

	@Transactional
	public FinanceEventDto mergeEvents(
			Long baseEventId,
			List<Long> sourceIds,
			List<Long> groupByNodeIds,
			Long categoryId,
			List<Long> tagIds,
			String name,
			String description)
			throws BusinessException {
		if (sourceIds == null || sourceIds.isEmpty()) {
			throw messages.reject(MsgKey.EVENT_MERGE_NO_SOURCES);
		}

		FinanceEventEntity baseEvent = eventRepository.findById(baseEventId);
		if (baseEvent == null) {
			throw messages.reject(MsgKey.EVENT_NOT_FOUND);
		}

		if (sourceIds.contains(baseEventId)) {
			throw messages.reject(MsgKey.EVENT_MERGE_SELF);
		}

		List<FinanceEventEntity> sourceEvents = validateAndFetchRelatedEvents(sourceIds);
		sourceEvents.sort(Comparator.comparing(event -> event.transaction.transactionDate));

		boolean sameEventType = sourceEvents.stream().allMatch(source -> source.type == baseEvent.type);
		if (!sameEventType) {
			throw messages.reject(MsgKey.EVENT_MERGE_MIXED_TYPES);
		}

		Set<Long> groupedNodeIds = groupByNodeIds != null ? new HashSet<>(groupByNodeIds) : new HashSet<>();
		List<FinanceLineItemEntity> allLineItems = new ArrayList<>();
		if (baseEvent.transaction != null && baseEvent.transaction.lineItems != null) {
			allLineItems.addAll(baseEvent.transaction.lineItems);
		}
		for (FinanceEventEntity sourceEvent : sourceEvents) {
			if (sourceEvent.transaction != null && sourceEvent.transaction.lineItems != null) {
				allLineItems.addAll(sourceEvent.transaction.lineItems);
			}
		}

		Map<FinanceNodeEntity, BigDecimal> aggregatedAmountsByNode = new LinkedHashMap<>();
		List<FinanceLineItemEntity> nonGroupedLineItems = new ArrayList<>();

		for (FinanceLineItemEntity lineItem : allLineItems) {
			if (lineItem.financeNode == null) {
				continue;
			}
			if (groupedNodeIds.contains(lineItem.financeNode.id)) {
				aggregatedAmountsByNode.merge(lineItem.financeNode, lineItem.amount, BigDecimal::add);
			} else {
				nonGroupedLineItems.add(lineItem);
			}
		}

		FinanceTransactionEntity baseTransaction = baseEvent.transaction;
		baseTransaction.lineItems.clear();
		List<FinanceLineItemEntity> mergedLineItems = new ArrayList<>();

		for (Map.Entry<FinanceNodeEntity, BigDecimal> aggregatedEntry : aggregatedAmountsByNode.entrySet()) {
			FinanceLineItemEntity mergedItem = new FinanceLineItemEntity();
			mergedItem.transaction = baseTransaction;
			mergedItem.financeNode = aggregatedEntry.getKey();
			mergedItem.amount = aggregatedEntry.getValue();
			mergedLineItems.add(mergedItem);
		}

		for (FinanceLineItemEntity lineItem : nonGroupedLineItems) {
			FinanceLineItemEntity mergedItem = new FinanceLineItemEntity();
			mergedItem.transaction = baseTransaction;
			mergedItem.financeNode = lineItem.financeNode;
			mergedItem.amount = lineItem.amount;
			mergedLineItems.add(mergedItem);
		}

		mergedLineItems.sort(this::compareMergedLineItems);
		baseTransaction.lineItems.addAll(mergedLineItems);

		if (name != null && !name.isBlank()) {
			baseEvent.name = name.trim();
		}

		if (description != null && !description.isBlank()) {
			baseEvent.description = description.trim();
		}

		if (categoryId != null) {
			baseEvent.category = categoryService.findEntityById(categoryId);
		}

		if (tagIds != null) {
			List<TagDto> tagDtos = tagIds.stream().map(tagId -> new TagDto(tagId, null, null, null, false)).toList();
			baseEvent.tags = tagService.resolveTags(tagDtos, TagResolveConfig.forNewEntity());
		}

		Set<FinanceEventEntity> sourceEventSet = new HashSet<>(sourceEvents);
		sourceEvents.stream()
				.flatMap(sourceEvent -> sourceEvent.relatedEvents.stream())
				.filter(relatedEvent -> !sourceEventSet.contains(relatedEvent))
				.collect(Collectors.toSet())
				.forEach(relatedEvent -> relatedEvent.relatedEvents.removeAll(sourceEventSet));
		sourceEvents.forEach(sourceEvent -> sourceEvent.relatedEvents.clear());

		for (FinanceEventEntity sourceEvent : sourceEvents) {
			entityDraftService.deleteByOriginalEntityId(sourceEvent.id, EntityType.FINANCE_EVENT);
			eventRepository.delete(sourceEvent);
		}

		Log.infof("Merged %d events into base id=%d: sources=%s", sourceIds.size(), baseEventId, sourceIds);
		return FinanceEventDto.from(baseEvent);
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
		return FinanceEventDto.from(event);
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
		return FinanceEventDto.from(event);
	}

	@Transactional
	public FinanceEventDto removeRelation(Long eventId, Long relatedId) throws BusinessException {
		return removeRelations(eventId, List.of(relatedId));
	}

	private int compareMergedLineItems(FinanceLineItemEntity first, FinanceLineItemEntity second) {
		int signComparison = Boolean.compare(!isNegativeAmount(first.amount), !isNegativeAmount(second.amount));
		if (signComparison != 0) {
			return signComparison;
		}

		if (isNegativeAmount(first.amount) && isNegativeAmount(second.amount)) {
			int amountComparison = second.amount.compareTo(first.amount);
			if (amountComparison != 0) {
				return amountComparison;
			}
		}

		return compareNodeId(first.financeNode, second.financeNode);
	}

	private int compareNodeId(FinanceNodeEntity first, FinanceNodeEntity second) {
		Long firstNodeId = first != null ? first.id : null;
		Long secondNodeId = second != null ? second.id : null;
		if (firstNodeId == null && secondNodeId == null) {
			return 0;
		}
		if (firstNodeId == null) {
			return 1;
		}
		if (secondNodeId == null) {
			return -1;
		}
		return firstNodeId.compareTo(secondNodeId);
	}

	private boolean isNegativeAmount(BigDecimal amount) {
		return amount != null && amount.compareTo(BigDecimal.ZERO) < 0;
	}

	private List<FinanceEventEntity> validateAndFetchRelatedEvents(List<Long> relatedIds) throws BusinessException {
		List<FinanceEventEntity> foundEvents = eventRepository.list("id IN ?1", relatedIds);
		if (foundEvents.size() != relatedIds.size()) {
			throw messages.reject(MsgKey.EVENT_RELATED_NOT_FOUND);
		}
		return foundEvents;
	}
}
