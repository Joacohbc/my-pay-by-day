package com.mypaybyday.service;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Event;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.CategoryDto;
import com.mypaybyday.dto.CategoryResolveConfig;
import com.mypaybyday.dto.PagedResponse;
import com.mypaybyday.entity.CategoryEntity;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.CategoryRepository;
import com.mypaybyday.repository.EventRepository;
import com.mypaybyday.repository.SubscriptionRepository;
import com.mypaybyday.repository.TemplateRepository;
import com.mypaybyday.service.duplicate.DuplicateDetectionEvent;
import com.mypaybyday.validation.CategoryValidator;
import io.quarkus.panache.common.Page;

@ApplicationScoped
public class CategoryService {

	private final CategoryRepository categoryRepository;
	private final Event<DuplicateDetectionEvent> duplicateDetectionEventBus;
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
			Event<DuplicateDetectionEvent> duplicateDetectionEventBus,
			TemplateRepository templateRepository,
			SubscriptionRepository subscriptionRepository) {
		this.categoryRepository = categoryRepository;
		this.duplicateDetectionEventBus = duplicateDetectionEventBus;
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
	public PagedResponse<CategoryDto> listAll(int page, int size, Boolean archived) {
		boolean showArchived = Boolean.TRUE.equals(archived);
		long totalElements = categoryRepository.count("archived = ?1", showArchived);
		List<CategoryDto> content = categoryRepository.find("archived = ?1", showArchived)
				.page(Page.of(page, size))
				.stream()
				.map(CategoryDto::from)
				.toList();
		return PagedResponse.of(content, page, size, totalElements);
	}

	@Transactional
	public CategoryDto findById(Long id) throws BusinessException {
		return CategoryDto.from(findEntityById(id, false));
	}

	/**
	 * Internal method used by other services that need a managed {@link CategoryEntity} entity.
	 * Throws if the category is archived — archived categories cannot be used in new events.
	 */
	public CategoryEntity findEntityById(Long id) throws BusinessException {
		return findEntityById(id, true);
	}

	/**
	 * Internal method used by other services that need a managed {@link CategoryEntity} entity.
	 */
	public CategoryEntity findEntityById(Long id, boolean failIfArchived) throws BusinessException {
		CategoryEntity category = categoryRepository.findById(id);
		if (category == null) {
			throw new BusinessException(messages.get(MsgKey.CATEGORY_NOT_FOUND, id));
		}
		if (failIfArchived && category.archived) {
			throw new BusinessException(messages.get(MsgKey.CATEGORY_NOT_FOUND_ARCHIVED, id));
		}
		return category;
	}

	/**
	 * Resolves a CategoryDto into a managed CategoryEntity according to the provided config.
	 */
	@Transactional
	public CategoryEntity resolveCategory(CategoryDto catDto, CategoryResolveConfig config) throws BusinessException {
		if (catDto == null) {
			return null;
		}
		if (catDto.id() == null) {
			throw new BusinessException(messages.get(MsgKey.EVENT_CATEGORY_ID_REQUIRED));
		}

		CategoryEntity category = categoryRepository.findById(catDto.id());
		if (category == null) {
			throw new BusinessException(messages.get(MsgKey.CATEGORY_NOT_FOUND, catDto.id()));
		}

		if (category.archived) {
			boolean allowed = switch (config.strategy()) {
				case ALLOW_ALL_ARCHIVED -> true;
				case ALLOW_ONLY_EXISTING_ARCHIVED -> category.id.equals(config.existingCategoryId());
				case NOT_ALLOW_ARCHIVED -> false;
			};
			if (!allowed) {
				throw new BusinessException(messages.get(MsgKey.CATEGORY_NOT_FOUND_ARCHIVED, catDto.id()));
			}
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
		duplicateDetectionEventBus.fireAsync(DuplicateDetectionEvent.forCategory(category.id));
		return CategoryDto.from(category);
	}

	@Transactional
	public CategoryDto update(Long id, CategoryDto dto) throws BusinessException {
		CategoryEntity category = findEntityById(id, false);
		if (dto.name() == null || dto.name().isBlank()) {
			throw new BusinessException(messages.get(MsgKey.CATEGORY_NAME_REQUIRED));
		}
		category.name = dto.name();
		category.description = dto.description();
		category.icon = dto.icon();

		categoryValidator.validate(category);

		duplicateDetectionEventBus.fireAsync(DuplicateDetectionEvent.forCategory(id));
		return CategoryDto.from(category);
	}

	@Transactional
	public void archive(Long id) throws BusinessException {
		CategoryEntity category = findEntityById(id, false);

		boolean inUseForRecurring = templateRepository.countByCategory(category) > 0
				|| subscriptionRepository.countByCategory(category) > 0;

		if (inUseForRecurring) {
			throw new BusinessException(messages.get(MsgKey.CATEGORY_ARCHIVE_IN_USE));
		}

		category.archived = true;
	}

	@Transactional
	public void unarchive(Long id) throws BusinessException {
		CategoryEntity category = findEntityById(id, false);
		category.archived = false;
	}

	@Transactional
	public void delete(Long id) throws BusinessException {
		CategoryEntity category = findEntityById(id, false);

		boolean inUse = eventRepository.countByCategory(category) > 0
				|| templateRepository.countByCategory(category) > 0
				|| subscriptionRepository.countByCategory(category) > 0;

		if (inUse) {
			throw new BusinessException(messages.get(MsgKey.CATEGORY_IN_USE));
		}

		categoryRepository.delete(category);
	}

}
