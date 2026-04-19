package com.mypaybyday.service;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.CategoryDto;
import com.mypaybyday.dto.PagedResponse;
import com.mypaybyday.entity.CategoryEntity;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.entity.SystemJobEntity;
import com.mypaybyday.enums.JobCategory;
import com.mypaybyday.enums.JobStatus;
import com.mypaybyday.repository.SystemJobRepository;
import java.time.LocalDate;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.CategoryRepository;
import com.mypaybyday.repository.EventRepository;
import com.mypaybyday.repository.SubscriptionRepository;
import com.mypaybyday.repository.TemplateRepository;
import com.mypaybyday.validation.CategoryValidator;
import io.quarkus.panache.common.Page;

@ApplicationScoped
public class CategoryService {

	private final CategoryRepository categoryRepository;
	private final SystemJobRepository systemJobRepository;
	private final Messages messages;
	private final CategoryValidator categoryValidator;
	private final EventRepository eventRepository;
	private final TemplateRepository templateRepository;
	private final SubscriptionRepository subscriptionRepository;

	public CategoryService(
			CategoryRepository categoryRepository,
			Messages messages,
			CategoryValidator categoryValidator,
			EventRepository eventRepository,
			SystemJobRepository systemJobRepository,
			TemplateRepository templateRepository,
			SubscriptionRepository subscriptionRepository) {
		this.categoryRepository = categoryRepository;
		this.systemJobRepository = systemJobRepository;
		this.messages = messages;
		this.categoryValidator = categoryValidator;
		this.eventRepository = eventRepository;
		this.templateRepository = templateRepository;
		this.subscriptionRepository = subscriptionRepository;
	}

	// -------------------------------------------------------------------------
	// Queries
	// -------------------------------------------------------------------------

	@Transactional
	public PagedResponse<CategoryDto> listAll(int page, int size) {
		long totalElements = categoryRepository.count();
		List<CategoryDto> content = categoryRepository.findAll()
				.page(Page.of(page, size))
				.stream()
				.map(CategoryDto::from)
				.toList();
		return PagedResponse.of(content, page, size, totalElements);
	}

	@Transactional
	public CategoryDto findById(Long id) throws BusinessException {
		return CategoryDto.from(findEntityById(id));
	}

	/**
	* Internal method used by other services that need a managed {@link CategoryEntity} entity
	* (e.g. {@link EventService} when resolving a category reference).
	*/
	CategoryEntity findEntityById(Long id) throws BusinessException {
		CategoryEntity category = categoryRepository.findById(id);
		if (category == null) {
			throw new BusinessException(messages.get(MsgKey.CATEGORY_NOT_FOUND, id));
		}
		return category;
	}

	// -------------------------------------------------------------------------
	// Commands
	// -------------------------------------------------------------------------

	@Transactional
	public CategoryDto create(CategoryDto dto) throws BusinessException {
		if (dto.name() == null || dto.name().isBlank()) {
			throw new BusinessException(messages.get(MsgKey.CATEGORY_NAME_REQUIRED));
		}
		CategoryEntity category = new CategoryEntity();
		category.name = dto.name();
		category.description = dto.description();
		category.icon = dto.icon();

		categoryValidator.validate(category);

		categoryRepository.persist(category);
		return CategoryDto.from(category);
	}

	@Transactional
	public CategoryDto update(Long id, CategoryDto dto) throws BusinessException {
		CategoryEntity category = findEntityById(id);
		if (dto.name() == null || dto.name().isBlank()) {
			throw new BusinessException(messages.get(MsgKey.CATEGORY_NAME_REQUIRED));
		}
		category.name = dto.name();
		category.description = dto.description();
		category.icon = dto.icon();

		categoryValidator.validate(category);

		return CategoryDto.from(category);
	}

	@Transactional
	public void delete(Long id) throws BusinessException {
		CategoryEntity category = findEntityById(id);

		boolean inUse = eventRepository.countByCategory(category) > 0
				|| templateRepository.countByCategory(category) > 0
				|| subscriptionRepository.countByCategory(category) > 0;

		if (inUse) {
			throw new BusinessException(messages.get(MsgKey.CATEGORY_IN_USE));
		}

		categoryRepository.delete(category);
	}

	private void scheduleDuplicateDetectionJob(Long categoryId) {
		SystemJobEntity job = new SystemJobEntity();
		job.jobCategory = JobCategory.DUPLICATE_DETECTION;
		job.status = JobStatus.PENDING;
		job.nextExecutionDate = LocalDate.now();
		job.entityId = "CATEGORY:" + categoryId;
		systemJobRepository.persist(job);
	}

}
