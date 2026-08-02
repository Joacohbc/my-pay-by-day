package com.mypaybyday.service.event;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.BulkPatchEventDto;
import com.mypaybyday.dto.CategoryBalanceDto;
import com.mypaybyday.dto.EventQuery;
import com.mypaybyday.dto.FileDto;
import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.FinanceLineItemDto;
import com.mypaybyday.dto.PagedResponse;
import com.mypaybyday.dto.PatchEventDto;
import com.mypaybyday.dto.RelatedEventDto;
import com.mypaybyday.dto.SectionImportResult;
import com.mypaybyday.dto.TagDto;
import com.mypaybyday.entity.FileEntity;
import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.entity.FinanceLineItemEntity;
import com.mypaybyday.entity.FinanceNodeEntity;
import com.mypaybyday.entity.FinanceTransactionEntity;
import com.mypaybyday.entity.TagEntity;
import com.mypaybyday.enums.DataSection;
import com.mypaybyday.enums.EntityType;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.CategoryRepository;
import com.mypaybyday.repository.EventRepository;
import com.mypaybyday.repository.FinanceNodeRepository;
import com.mypaybyday.repository.SubscriptionRepository;
import com.mypaybyday.repository.TagRepository;
import com.mypaybyday.repository.TransactionRepository;
import com.mypaybyday.service.DraftService;
import com.mypaybyday.service.PaymentPlanService;
import com.mypaybyday.service.transfer.ArchivedItemImporter;
import com.mypaybyday.service.transfer.DataSectionTransfer;
import com.mypaybyday.service.transfer.ImportContext;
import com.mypaybyday.validation.RegexValidator;
import com.mypaybyday.validation.TransactionValidator;
import io.quarkus.logging.Log;

@ApplicationScoped
public class EventService implements DataSectionTransfer<FinanceEventDto> {

	private final EventGetService eventGetService;
	private final EventCreateService eventCreateService;
	private final EventUpdateService eventUpdateService;
	private final EventMergeService eventMergeService;
	private final EventRepository eventRepository;
	private final FinanceNodeRepository financeNodeRepository;
	private final CategoryRepository categoryRepository;
	private final TagRepository tagRepository;
	private final SubscriptionRepository subscriptionRepository;
	private final TransactionRepository transactionRepository;
	private final TransactionValidator transactionValidator;
	private final RegexValidator regexValidator;
	private final Messages messages;
	private final DraftService entityDraftService;
	private final PaymentPlanService paymentPlanService;
	private final ArchivedItemImporter archivedItemImporter;

	public EventService(
			EventGetService eventGetService,
			EventCreateService eventCreateService,
			EventUpdateService eventUpdateService,
			EventMergeService eventMergeService,
			EventRepository eventRepository,
			FinanceNodeRepository financeNodeRepository,
			CategoryRepository categoryRepository,
			TagRepository tagRepository,
			SubscriptionRepository subscriptionRepository,
			TransactionRepository transactionRepository,
			TransactionValidator transactionValidator,
			RegexValidator regexValidator,
			Messages messages,
			DraftService entityDraftService,
			PaymentPlanService paymentPlanService,
			ArchivedItemImporter archivedItemImporter) {
		this.eventGetService = eventGetService;
		this.eventCreateService = eventCreateService;
		this.eventUpdateService = eventUpdateService;
		this.eventMergeService = eventMergeService;
		this.eventRepository = eventRepository;
		this.financeNodeRepository = financeNodeRepository;
		this.categoryRepository = categoryRepository;
		this.tagRepository = tagRepository;
		this.subscriptionRepository = subscriptionRepository;
		this.transactionRepository = transactionRepository;
		this.transactionValidator = transactionValidator;
		this.regexValidator = regexValidator;
		this.messages = messages;
		this.entityDraftService = entityDraftService;
		this.paymentPlanService = paymentPlanService;
		this.archivedItemImporter = archivedItemImporter;
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
	public List<FinanceEventDto> bulkUpdate(BulkPatchEventDto patch) throws BusinessException {
		return eventUpdateService.bulkUpdate(patch);
	}

	@Transactional
	public void delete(Long id) throws BusinessException {
		FinanceEventEntity event = eventRepository.findById(id);
		if (event == null) {
			throw messages.reject(MsgKey.EVENT_NOT_FOUND);
		}
		entityDraftService.deleteByOriginalEntityId(id, EntityType.FINANCE_EVENT);
		paymentPlanService.unlinkEvent(id);
		eventRepository.delete(event);
		Log.infof("Deleted event id=%d", id);
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

	// -------------------------------------------------------------------------
	// Data transfer
	// -------------------------------------------------------------------------

	@Override
	public DataSection section() {
		return DataSection.EVENTS;
	}

	@Override
	@Transactional
	public long countForExport() {
		return eventRepository.count();
	}

	@Override
	@Transactional
	public List<FinanceEventDto> exportData() {
		return eventRepository.listAll().stream().map(FinanceEventDto::from).toList();
	}

	@Override
	@Transactional
	public SectionImportResult importData(List<FinanceEventDto> items, ImportContext context) {
		return archivedItemImporter.importEach(section(), items, FinanceEventDto::name, dto -> {
			FinanceTransactionEntity tx = new FinanceTransactionEntity();
			tx.transactionDate = dto.transactionDate();

			if (dto.lineItems() != null) {
				for (FinanceLineItemDto liDto : dto.lineItems()) {
					Long newNodeId = context.remap(DataSection.FINANCE_NODES, liDto.financeNodeId());
					if (newNodeId == null) {
						throw messages.reject(MsgKey.NODE_NOT_FOUND);
					}
					FinanceNodeEntity node = financeNodeRepository.findById(newNodeId);
					if (node == null) {
						throw messages.reject(MsgKey.NODE_NOT_FOUND);
					}
					FinanceLineItemEntity li = new FinanceLineItemEntity();
					li.amount = liDto.amount();
					li.financeNode = node;
					li.transaction = tx;
					tx.lineItems.add(li);
				}
			}

			transactionValidator.validateZeroSum(tx);
			transactionRepository.persist(tx);

			FinanceEventEntity event = new FinanceEventEntity();
			event.name = regexValidator.sanitize(dto.name());
			event.description = regexValidator.sanitize(dto.description());
			event.type = dto.type();
			event.transaction = tx;

			if (dto.category() != null && dto.category().id() != null) {
				Long newCategoryId = context.remap(DataSection.CATEGORIES, dto.category().id());
				if (newCategoryId != null) {
					event.category = categoryRepository.findById(newCategoryId);
				}
			}

			Set<TagEntity> resolvedTags = new HashSet<>();
			if (dto.tags() != null) {
				for (TagDto tagDto : dto.tags()) {
					Long newTagId = context.remap(DataSection.TAGS, tagDto.id());
					if (newTagId != null) {
						TagEntity tag = tagRepository.findById(newTagId);
						if (tag != null) {
							resolvedTags.add(tag);
						}
					}
				}
			}
			event.tags = resolvedTags;

			if (dto.files() != null) {
				for (FileDto fDto : dto.files()) {
					Long newFileId = context.remap(DataSection.FILES, fDto.id());
					if (newFileId != null) {
						FileEntity fEntity = FileEntity.findById(newFileId);
						if (fEntity != null) {
							event.files.add(fEntity);
						}
					}
				}
			}

			if (dto.subscriptionId() != null) {
				Long newSubId = context.remap(DataSection.SUBSCRIPTIONS, dto.subscriptionId());
				if (newSubId != null) {
					event.subscription = subscriptionRepository.findById(newSubId);
				}
			}

			regexValidator.validateNameAndDescription(event.name, event.description);
			eventRepository.persist(event);
			context.rememberId(section(), dto.id(), event.id);
		});
	}

	@Override
	@Transactional
	public void linkDeferredReferences(ImportContext context) {
		Map<Long, Long> remappedEventIds = context.remappedIds(section());
		if (remappedEventIds.isEmpty()) return;

		for (Map.Entry<Long, Long> entry : remappedEventIds.entrySet()) {
			Long oldId = entry.getKey();
			Long newId = entry.getValue();
			FinanceEventEntity event = eventRepository.findById(newId);
			if (event == null) continue;

			// Note: relatedEvents are self-references, linked via remapped event IDs if present
		}
	}
}
