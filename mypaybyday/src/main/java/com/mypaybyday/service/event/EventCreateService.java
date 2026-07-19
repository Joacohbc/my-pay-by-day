package com.mypaybyday.service.event;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Event;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.CategoryDto;
import com.mypaybyday.dto.CategoryResolveConfig;
import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.TagDto;
import com.mypaybyday.dto.TagResolveConfig;
import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.entity.FinanceTransactionEntity;
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
public class EventCreateService {

	private final EventRepository eventRepository;
	private final TransactionService transactionService;
	private final CategoryService categoryService;
	private final TagService tagService;
	private final Messages messages;
	private final EventValidator eventValidator;
	private final EventFileResolverService eventFileResolverService;
	private final Event<DuplicateDetectionEvent> duplicateDetectionEventBus;

	public EventCreateService(
			EventRepository eventRepository,
			TransactionService transactionService,
			CategoryService categoryService,
			TagService tagService,
			Messages messages,
			EventValidator eventValidator,
			EventFileResolverService eventFileResolverService,
			Event<DuplicateDetectionEvent> duplicateDetectionEventBus) {
		this.eventRepository = eventRepository;
		this.transactionService = transactionService;
		this.categoryService = categoryService;
		this.tagService = tagService;
		this.messages = messages;
		this.eventValidator = eventValidator;
		this.eventFileResolverService = eventFileResolverService;
		this.duplicateDetectionEventBus = duplicateDetectionEventBus;
	}

	@Transactional
	public FinanceEventDto create(FinanceEventEntity event) throws BusinessException {
		if (event.transaction == null) {
			throw messages.reject(MsgKey.EVENT_TRANSACTION_REQUIRED);
		}

		FinanceTransactionEntity createdTransaction = transactionService.create(event.transaction);

		if (event.category != null && event.category.id != null) {
			event.category = categoryService.resolveCategory(CategoryDto.from(event.category), CategoryResolveConfig.forNewEntity());
		}

		List<TagDto> incomingTags = event.tags == null ? List.of() : event.tags.stream().map(TagDto::from).toList();
		event.tags = tagService.resolveTags(incomingTags, TagResolveConfig.forNewEntity());
		event.files = eventFileResolverService.resolveFiles(event.fileIds);
		event.transaction = createdTransaction;

		eventValidator.validate(event);
		eventRepository.persist(event);
		duplicateDetectionEventBus.fireAsync(DuplicateDetectionEvent.forEvent(event.id));
		Log.infof("Created event id=%d type=%s category=%s transaction=%d", event.id, event.type,
				event.category != null ? event.category.id : null, createdTransaction.id);
		return FinanceEventDto.from(event);
	}
}
