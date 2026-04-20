package com.mypaybyday.service.event;

import java.time.LocalDateTime;
import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.CategoryBalanceDto;
import com.mypaybyday.dto.EventQuery;
import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.PagedResponse;
import com.mypaybyday.dto.PatchEventDto;
import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.enums.EntityType;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.EventRepository;
import com.mypaybyday.service.DraftService;

@ApplicationScoped
public class EventService {

	private final EventGetService eventGetService;
	private final EventCreateService eventCreateService;
	private final EventUpdateService eventUpdateService;
	private final EventMergeService eventMergeService;
	private final EventRepository eventRepository;
	private final Messages messages;
	private final DraftService entityDraftService;

	public EventService(
			EventGetService eventGetService,
			EventCreateService eventCreateService,
			EventUpdateService eventUpdateService,
			EventMergeService eventMergeService,
			EventRepository eventRepository,
			Messages messages,
			DraftService entityDraftService) {
		this.eventGetService = eventGetService;
		this.eventCreateService = eventCreateService;
		this.eventUpdateService = eventUpdateService;
		this.eventMergeService = eventMergeService;
		this.eventRepository = eventRepository;
		this.messages = messages;
		this.entityDraftService = entityDraftService;
	}

	@Transactional
	public PagedResponse<FinanceEventDto> listAll(EventQuery query) {
		return eventGetService.listAll(query);
	}

	@Transactional
	public FinanceEventDto findById(Long id) throws BusinessException {
		return eventGetService.findById(id);
	}

	@Transactional
	public List<FinanceEventDto> findByDateRange(LocalDateTime from, LocalDateTime to) throws BusinessException {
		return eventGetService.findByDateRange(from, to);
	}

	@Transactional
	public CategoryBalanceDto getCategoryBalance(Long categoryId, LocalDateTime from, LocalDateTime to) throws BusinessException {
		return eventGetService.getCategoryBalance(categoryId, from, to);
	}

	@Transactional
	public FinanceEventDto create(FinanceEventEntity event) throws BusinessException {
		return eventCreateService.create(event);
	}

	@Transactional
	public FinanceEventDto update(Long id, PatchEventDto patch) throws BusinessException {
		return eventUpdateService.update(id, patch);
	}

	@Transactional
	public void delete(Long id) throws BusinessException {
		FinanceEventEntity event = eventRepository.findById(id);
		if (event == null) {
			throw new BusinessException(messages.get(MsgKey.EVENT_NOT_FOUND));
		}
		entityDraftService.deleteByOriginalEntityId(id, EntityType.FINANCE_EVENT);
		eventRepository.delete(event);
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
		return eventMergeService.mergeEvents(baseEventId, sourceIds, groupByNodeIds, categoryId, tagIds, name, description);
	}

	@Transactional
	public FinanceEventDto addRelations(Long eventId, List<Long> relatedIds) throws BusinessException {
		return eventMergeService.addRelations(eventId, relatedIds);
	}

	@Transactional
	public FinanceEventDto removeRelations(Long eventId, List<Long> relatedIds) throws BusinessException {
		return eventMergeService.removeRelations(eventId, relatedIds);
	}

	@Transactional
	public FinanceEventDto removeRelation(Long eventId, Long relatedId) throws BusinessException {
		return eventMergeService.removeRelation(eventId, relatedId);
	}
}
