package com.mypaybyday.service.duplicate;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.DuplicateRecordDto;
import com.mypaybyday.entity.CategoryEntity;
import com.mypaybyday.entity.DuplicateRecordEntity;
import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.entity.TagEntity;
import com.mypaybyday.enums.DuplicateRecordStatus;
import com.mypaybyday.enums.EntityType;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.repository.CategoryRepository;
import com.mypaybyday.repository.DuplicateRecordRepository;
import com.mypaybyday.repository.EventRepository;
import com.mypaybyday.repository.TagRepository;
import org.jboss.logging.Logger;

@ApplicationScoped
public class DuplicateDetectionService {

	private static final Logger LOG = Logger.getLogger(DuplicateDetectionService.class);

	private final DuplicateRecordRepository duplicateRecordRepository;
	private final EventRepository eventRepository;
	private final CategoryRepository categoryRepository;
	private final TagRepository tagRepository;

	private final EventDuplicateDetectionService eventDuplicateDetectionService;
	private final CategoryDuplicateDetectionService categoryDuplicateDetectionService;
	private final TagDuplicateDetectionService tagDuplicateDetectionService;

	private final Messages messages;

	public DuplicateDetectionService(DuplicateRecordRepository duplicateRecordRepository,
			EventRepository eventRepository,
			CategoryRepository categoryRepository,
			TagRepository tagRepository,
			EventDuplicateDetectionService eventDuplicateDetectionService,
			CategoryDuplicateDetectionService categoryDuplicateDetectionService,
			TagDuplicateDetectionService tagDuplicateDetectionService,
			Messages messages) {
		this.duplicateRecordRepository = duplicateRecordRepository;
		this.eventRepository = eventRepository;
		this.categoryRepository = categoryRepository;
		this.tagRepository = tagRepository;
		this.eventDuplicateDetectionService = eventDuplicateDetectionService;
		this.categoryDuplicateDetectionService = categoryDuplicateDetectionService;
		this.tagDuplicateDetectionService = tagDuplicateDetectionService;
		this.messages = messages;
	}

	@Transactional
	public void detectDuplicatesForEvent(Long eventId) {
		eventDuplicateDetectionService.detectDuplicates(eventId);
	}

	@Transactional
	public void detectDuplicatesForCategory(Long categoryId) {
		categoryDuplicateDetectionService.detectDuplicates(categoryId);
	}

	@Transactional
	public void detectDuplicatesForTag(Long tagId) {
		tagDuplicateDetectionService.detectDuplicates(tagId);
	}

	@Transactional
	public void scanAll() {
		LOG.info("Starting mass duplicate detection scan...");
		List<FinanceEventEntity> events = eventRepository.listAll();
		for (FinanceEventEntity event : events) {
			detectDuplicatesForEvent(event.id);
		}

		List<CategoryEntity> categories = categoryRepository.listAll();
		for (CategoryEntity category : categories) {
			detectDuplicatesForCategory(category.id);
		}

		List<TagEntity> tags = tagRepository.listAll();
		for (TagEntity tag : tags) {
			detectDuplicatesForTag(tag.id);
		}
		LOG.info("Mass duplicate detection scan completed.");
	}

	@Transactional
	public void resolveDuplicate(Long recordId, DuplicateRecordStatus action, Long keepEntityId) {
		DuplicateRecordEntity record = duplicateRecordRepository.findById(recordId);
		if (record == null) return;

		List<DuplicateRecordEntity> pairRecords = duplicateRecordRepository.findAllByEntities(
			record.entityType,
			record.entityId1,
			record.entityId2
		);

		if (action == DuplicateRecordStatus.ACCEPTED_NOT_DUPLICATE) {
			for (DuplicateRecordEntity pairRecord : pairRecords) {
				pairRecord.status = DuplicateRecordStatus.ACCEPTED_NOT_DUPLICATE;
				duplicateRecordRepository.persist(pairRecord);
			}
			return;
		}

		if (action == DuplicateRecordStatus.RESOLVED_MERGED && keepEntityId != null) {
			Long deleteEntityId = record.entityId1.equals(keepEntityId) ? record.entityId2 : record.entityId1;

			if (record.entityType == EntityType.CATEGORY) {
				categoryDuplicateDetectionService.merge(keepEntityId, deleteEntityId);
			} else if (record.entityType == EntityType.TAG) {
				tagDuplicateDetectionService.merge(keepEntityId, deleteEntityId);
			} else if (record.entityType == EntityType.FINANCE_EVENT) {
				eventDuplicateDetectionService.delete(deleteEntityId);
			}

			for (DuplicateRecordEntity pairRecord : pairRecords) {
				pairRecord.status = DuplicateRecordStatus.RESOLVED_MERGED;
				duplicateRecordRepository.persist(pairRecord);
			}
		}
	}

	public List<DuplicateRecordDto> getDuplicates(EntityType type, DuplicateRecordStatus status) throws BusinessException {
		if (type == null || status == null) {
			throw messages.reject(MsgKey.DUPLICATES_TYPE_AND_STATUS_REQUIRED);
		}
		return duplicateRecordRepository.findByEntityTypeAndStatus(type, status).stream()
				.map(r -> DuplicateRecordDto.fromEntity(r, categoryRepository, tagRepository))
				.toList();
	}

	public List<DuplicateRecordDto> getDuplicatesForEntity(EntityType type, Long id, DuplicateRecordStatus status) {
		return duplicateRecordRepository.findByEntityIdAndStatus(type, id, status).stream()
				.map(r -> DuplicateRecordDto.fromEntity(r, categoryRepository, tagRepository))
				.toList();
	}
}
