package com.mypaybyday.service;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.PagedResponse;
import com.mypaybyday.dto.TagDto;
import com.mypaybyday.entity.TagEntity;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.entity.SystemJobEntity;
import com.mypaybyday.enums.JobCategory;
import com.mypaybyday.enums.JobStatus;
import com.mypaybyday.repository.SystemJobRepository;
import java.time.LocalDate;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.EventRepository;
import com.mypaybyday.repository.SubscriptionRepository;
import com.mypaybyday.repository.TagRepository;
import com.mypaybyday.repository.TemplateRepository;
import com.mypaybyday.validation.TagValidator;
import io.quarkus.panache.common.Page;

@ApplicationScoped
public class TagService {

	private final TagRepository tagRepository;
	private final SystemJobRepository systemJobRepository;
	private final Messages messages;
	private final TagValidator tagValidator;
	private final EventRepository eventRepository;
	private final TemplateRepository templateRepository;
	private final SubscriptionRepository subscriptionRepository;

	public TagService(
			TagRepository tagRepository,
			Messages messages,
			TagValidator tagValidator,
			EventRepository eventRepository,
			TemplateRepository templateRepository,
			SubscriptionRepository subscriptionRepository,
			SystemJobRepository systemJobRepository) {
		this.tagRepository = tagRepository;
		this.systemJobRepository = systemJobRepository;
		this.messages = messages;
		this.tagValidator = tagValidator;
		this.eventRepository = eventRepository;
		this.templateRepository = templateRepository;
		this.subscriptionRepository = subscriptionRepository;
	}

	// -------------------------------------------------------------------------
	// Queries
	// -------------------------------------------------------------------------

	@Transactional
	public PagedResponse<TagDto> listAll(int page, int size) {
		long totalElements = tagRepository.count();
		List<TagDto> content = tagRepository.findAll()
				.page(Page.of(page, size))
				.stream()
				.map(TagDto::from)
				.toList();
		return PagedResponse.of(content, page, size, totalElements);
	}

	@Transactional
	public TagDto findById(Long id) throws BusinessException {
		return TagDto.from(findTagEntity(id));
	}

	/**
	* Internal method used by other services that need a managed {@link TagEntity} entity
	* (e.g. {@link EventService} when resolving tag references).
	*/
	TagEntity findTagEntity(Long id) throws BusinessException {
		TagEntity tag = tagRepository.findById(id);
		if (tag == null) {
			throw new BusinessException(messages.get(MsgKey.TAG_NOT_FOUND, id));
		}
		return tag;
	}

	// -------------------------------------------------------------------------
	// Commands
	// -------------------------------------------------------------------------

	@Transactional
	public TagDto create(TagDto dto) throws BusinessException {
		if (dto.name() == null || dto.name().isBlank()) {
			throw new BusinessException(messages.get(MsgKey.TAG_NAME_REQUIRED));
		}
		TagEntity tag = new TagEntity();
		tag.name = dto.name();
		tag.description = dto.description();

		tagValidator.validate(tag);

		tagRepository.persist(tag);
		return TagDto.from(tag);
	}

	@Transactional
	public TagDto update(Long id, TagDto dto) throws BusinessException {
		TagEntity tag = findTagEntity(id);
		if (dto.name() == null || dto.name().isBlank()) {
			throw new BusinessException(messages.get(MsgKey.TAG_NAME_REQUIRED));
		}
		tag.name = dto.name();
		tag.description = dto.description();

		tagValidator.validate(tag);

		return TagDto.from(tag);
	}

	@Transactional
	public void delete(Long id) throws BusinessException {
		TagEntity tag = findTagEntity(id);

		boolean inUse = eventRepository.countByTag(tag) > 0
				|| templateRepository.countByTag(tag) > 0
				|| subscriptionRepository.countByTag(tag) > 0;

		if (inUse) {
			throw new BusinessException(messages.get(MsgKey.TAG_IN_USE));
		}

		tagRepository.delete(tag);
	}

	private void scheduleDuplicateDetectionJob(Long tagId) {
		SystemJobEntity job = new SystemJobEntity();
		job.jobCategory = JobCategory.DUPLICATE_DETECTION;
		job.status = JobStatus.PENDING;
		job.nextExecutionDate = LocalDate.now();
		job.entityId = "TAG:" + tagId;
		systemJobRepository.persist(job);
	}

}
