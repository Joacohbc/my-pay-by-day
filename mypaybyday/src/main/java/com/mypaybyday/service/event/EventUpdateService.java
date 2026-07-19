package com.mypaybyday.service.event;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Event;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.BulkPatchEventDto;
import com.mypaybyday.dto.CategoryDto;
import com.mypaybyday.dto.CategoryResolveConfig;
import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.PatchEventDto;
import com.mypaybyday.dto.TagDto;
import com.mypaybyday.dto.TagResolveConfig;
import com.mypaybyday.entity.CategoryEntity;
import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.entity.TagEntity;
import com.mypaybyday.enums.EventType;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.EventRepository;
import com.mypaybyday.service.CategoryService;
import com.mypaybyday.service.TagService;
import com.mypaybyday.service.duplicate.DuplicateDetectionEvent;
import com.mypaybyday.validation.EventValidator;
import io.quarkus.logging.Log;

@ApplicationScoped
public class EventUpdateService {

	private final EventRepository eventRepository;
	private final CategoryService categoryService;
	private final TagService tagService;
	private final EventValidator eventValidator;
	private final TransactionService transactionService;
	private final EventFileResolverService eventFileResolverService;
	private final Messages messages;
	private final Event<DuplicateDetectionEvent> duplicateDetectionEventBus;

	public EventUpdateService(
			EventRepository eventRepository,
			CategoryService categoryService,
			TagService tagService,
			EventValidator eventValidator,
			TransactionService transactionService,
			EventFileResolverService eventFileResolverService,
			Messages messages,
			Event<DuplicateDetectionEvent> duplicateDetectionEventBus) {
		this.eventRepository = eventRepository;
		this.categoryService = categoryService;
		this.tagService = tagService;
		this.eventValidator = eventValidator;
		this.transactionService = transactionService;
		this.eventFileResolverService = eventFileResolverService;
		this.messages = messages;
		this.duplicateDetectionEventBus = duplicateDetectionEventBus;
	}

	@Transactional
	public FinanceEventDto update(Long id, PatchEventDto patch) throws BusinessException {
		FinanceEventEntity event = eventRepository.findById(id);
		if (event == null) {
			throw messages.reject(MsgKey.EVENT_NOT_FOUND);
		}

		if (patch.getName().isPresent()) {
			String name = patch.getName().get();
			if (name != null && !name.isBlank()) {
				event.name = name;
			}
		}

		if (patch.getDescription().isPresent()) {
			event.description = patch.getDescription().get();
		}

		if (patch.getType().isPresent()) {
			EventType type = patch.getType().get();
			if (type != null) {
				event.type = type;
			}
		}

		if (patch.getCategory().isPresent()) {
			CategoryDto category = patch.getCategory().get();
			Long existingCategoryId = event.category != null ? event.category.id : null;
			event.category = categoryService.resolveCategory(category, CategoryResolveConfig.forUpdate(existingCategoryId));
		}

		if (patch.getTags().isPresent()) {
			List<TagDto> tagDtos = patch.getTags().get();
			Set<Long> existingTagIds = event.tags.stream().map(tag -> tag.id).collect(Collectors.toSet());
			event.tags = tagService.resolveTags(tagDtos, TagResolveConfig.forUpdate(existingTagIds));
		}

		if (patch.getFileIds().isPresent()) {
			List<Long> fileIds = patch.getFileIds().get();
			if (fileIds == null || fileIds.isEmpty()) {
				event.files = new HashSet<>();
			} else {
				event.files = eventFileResolverService.resolveFiles(fileIds);
			}
		}

		if (patch.getTransaction().isPresent() && patch.getTransaction().get() != null) {
			transactionService.update(event.transaction.id, patch.getTransaction().get().toEntity());
		}

		eventValidator.validate(event);
		duplicateDetectionEventBus.fireAsync(DuplicateDetectionEvent.forEvent(id));
		Log.infof("Updated event id=%d transaction=%s", id, event.transaction != null ? event.transaction.id : null);
		return FinanceEventDto.from(event);
	}

	@Transactional
	public List<FinanceEventDto> bulkUpdate(BulkPatchEventDto patch) throws BusinessException {
		if (patch.getEventIds() == null || patch.getEventIds().isEmpty()) {
			Log.warn("Bulk update rejected: no event ids supplied");
			throw messages.reject(MsgKey.EVENT_BULK_NO_IDS);
		}

		List<FinanceEventEntity> events = eventRepository.list("id IN ?1", patch.getEventIds());
		if (events.size() != patch.getEventIds().size()) {
			Log.warnf("Bulk update rejected: requested %d ids but found %d", patch.getEventIds().size(), events.size());
			throw messages.reject(MsgKey.EVENT_BULK_EVENTS_NOT_FOUND);
		}

		boolean applyCategory = patch.getCategory().isPresent();
		CategoryEntity resolvedCategory = null;
		if (applyCategory) {
			CategoryDto categoryDto = patch.getCategory().get();
			if (categoryDto != null) {
				resolvedCategory = categoryService.resolveCategory(categoryDto, CategoryResolveConfig.forNewEntity());
			}
		}

		boolean applyTags = patch.getTags().isPresent();
		Set<TagEntity> resolvedTags = null;
		if (applyTags) {
			List<TagDto> tagDtos = patch.getTags().get();
			if (tagDtos != null && !tagDtos.isEmpty()) {
				resolvedTags = tagService.resolveTags(tagDtos, TagResolveConfig.forNewEntity());
			} else {
				resolvedTags = new HashSet<>();
			}
		}

		List<Long> updatedIds = new ArrayList<>();
		for (FinanceEventEntity event : events) {
			if (applyCategory) {
				event.category = resolvedCategory;
			}
			if (applyTags) {
				event.tags.clear();
				event.tags.addAll(resolvedTags);
			}
			updatedIds.add(event.id);
		}

		for (Long eventId : updatedIds) {
			duplicateDetectionEventBus.fireAsync(DuplicateDetectionEvent.forEvent(eventId));
		}
		Log.infof("Bulk updated %d events: ids=%s", updatedIds.size(), updatedIds);

		return events.stream().map(FinanceEventDto::from).toList();
	}
}
