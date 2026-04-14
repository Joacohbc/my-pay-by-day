package com.mypaybyday.service;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.RecordSelectionDto;
import com.mypaybyday.dto.UsageStatsDto;
import com.mypaybyday.entity.SelectionHistoryEntity;
import com.mypaybyday.enums.EntityType;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.EventRepository;
import com.mypaybyday.repository.LineItemRepository;
import com.mypaybyday.repository.SelectionHistoryRepository;

@ApplicationScoped
public class SelectionHistoryService {

	private final SelectionHistoryRepository selectionHistoryRepository;
	private final EventRepository eventRepository;
	private final LineItemRepository lineItemRepository;
	private final Messages messages;

	public SelectionHistoryService(
			SelectionHistoryRepository selectionHistoryRepository,
			EventRepository eventRepository,
			LineItemRepository lineItemRepository,
			Messages messages) {
		this.selectionHistoryRepository = selectionHistoryRepository;
		this.eventRepository = eventRepository;
		this.lineItemRepository = lineItemRepository;
		this.messages = messages;
	}

	@Transactional
	public void recordSelection(RecordSelectionDto dto) throws BusinessException {
		if (dto.entityType() == null) {
			throw new BusinessException(messages.get(MsgKey.SELECTION_HISTORY_ENTITY_TYPE_REQUIRED));
		}
		if (dto.entityId() == null) {
			throw new BusinessException(messages.get(MsgKey.SELECTION_HISTORY_ENTITY_ID_REQUIRED));
		}

		Optional<SelectionHistoryEntity> existing = selectionHistoryRepository
				.findByEntityTypeAndEntityId(dto.entityType(), dto.entityId());

		if (existing.isPresent()) {
			SelectionHistoryEntity entity = existing.get();
			entity.selectedAt = Instant.now();
			entity.selectionCount++;
		} else {
			SelectionHistoryEntity entity = SelectionHistoryEntity.builder()
					.entityType(dto.entityType())
					.entityId(dto.entityId())
					.selectedAt(Instant.now())
					.selectionCount(1)
					.build();
			selectionHistoryRepository.persist(entity);
		}
	}

	@Transactional
	public List<UsageStatsDto> getUsageStats(EntityType type) {
		// 1. Fetch domain usage counts
		Map<Long, Long> domainCounts = getDomainUsageCounts(type);

		// 2. Fetch selection history
		Map<Long, SelectionHistoryEntity> selections = selectionHistoryRepository
				.find("entityType", type)
				.stream()
				.collect(Collectors.toMap(s -> s.entityId, s -> s));

		// 3. Merge all IDs involved
		return domainCounts.keySet().stream()
				.collect(Collectors.toSet())
				.stream()
				.map(id -> {
					SelectionHistoryEntity selection = selections.get(id);
					return new UsageStatsDto(
							id,
							domainCounts.getOrDefault(id, 0L),
							selection != null ? selection.selectionCount : 0L,
							selection != null ? selection.selectedAt : null);
				})
				.toList();
	}

	private Map<Long, Long> getDomainUsageCounts(EntityType type) {
		List<Object[]> results = switch (type) {
			case CATEGORY -> eventRepository.countEventsPerCategory();
			case TAG -> eventRepository.countEventsPerTag();
			case FINANCE_NODE -> lineItemRepository.countLineItemsPerNode();
			case FINANCE_EVENT -> eventRepository.countRelationsPerEvent();
			default -> Collections.emptyList();
		};

		return results.stream()
				.collect(Collectors.toMap(
						row -> (Long) row[0],
						row -> (Long) row[1]));
	}
}
