package com.mypaybyday.service;

import java.util.ArrayList;
import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.PagedResponse;
import com.mypaybyday.dto.TemplateDto;
import com.mypaybyday.entity.TagEntity;
import com.mypaybyday.entity.TemplateEntity;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.SubscriptionRepository;
import com.mypaybyday.repository.TemplateRepository;
import com.mypaybyday.validation.TemplateValidator;
import io.quarkus.panache.common.Page;

@ApplicationScoped
public class TemplateService {

	private final TemplateRepository templateRepository;

	private final SubscriptionRepository subscriptionRepository;

	private final CategoryService categoryService;

	private final TagService tagService;

	private final FinanceNodeService financeNodeService;

	private final Messages messages;

	private final TemplateValidator templateValidator;

	public TemplateService(TemplateRepository templateRepository, SubscriptionRepository subscriptionRepository, CategoryService categoryService, TagService tagService, FinanceNodeService financeNodeService, Messages messages, TemplateValidator templateValidator) {
		this.templateRepository = templateRepository;
		this.subscriptionRepository = subscriptionRepository;
		this.categoryService = categoryService;
		this.tagService = tagService;
		this.financeNodeService = financeNodeService;
		this.messages = messages;
		this.templateValidator = templateValidator;
	}

	// -------------------------------------------------------------------------
	// Queries
	// -------------------------------------------------------------------------

	@Transactional
	public PagedResponse<TemplateDto> listAll(int page, int size) {
		long totalElements = templateRepository.count();
		List<TemplateDto> content = templateRepository.findAll()
				.page(Page.of(page, size))
				.stream()
				.map(TemplateDto::from)
				.toList();
		return PagedResponse.of(content, page, size, totalElements);
	}

	@Transactional
	public TemplateDto findById(Long id) throws BusinessException {
		return TemplateDto.from(findEntityById(id));
	}

	/**
	* Internal method used by other services that need a managed {@link TemplateEntity} entity
	* (e.g. {@link SubscriptionService} when resolving a template reference).
	*/
	TemplateEntity findEntityById(Long id) throws BusinessException {
		TemplateEntity template = templateRepository.findById(id);
		if (template == null) {
			throw new BusinessException(messages.get(MsgKey.TEMPLATE_NOT_FOUND, id));
		}
		return template;
	}

	// -------------------------------------------------------------------------
	// Commands
	// -------------------------------------------------------------------------

	@Transactional
	public TemplateDto create(TemplateDto dto) throws BusinessException {
		if (dto.name() == null || dto.name().isBlank()) {
			throw new BusinessException(messages.get(MsgKey.TEMPLATE_NAME_REQUIRED));
		}
		if ((dto.modifierType() != null && dto.modifierValue() == null) ||
			(dto.modifierType() == null && dto.modifierValue() != null)) {
			throw new BusinessException(messages.get(MsgKey.TEMPLATE_MODIFIER_VALIDATION));
		}
		TemplateEntity template = new TemplateEntity();
		applyDto(template, dto);
		templateRepository.persist(template);
		return TemplateDto.from(template);
	}

	@Transactional
	public TemplateDto update(Long id, TemplateDto dto) throws BusinessException {
		TemplateEntity template = findEntityById(id);
		if (dto.name() == null || dto.name().isBlank()) {
			throw new BusinessException(messages.get(MsgKey.TEMPLATE_NAME_REQUIRED));
		}
		if ((dto.modifierType() != null && dto.modifierValue() == null) ||
			(dto.modifierType() == null && dto.modifierValue() != null)) {
			throw new BusinessException(messages.get(MsgKey.TEMPLATE_MODIFIER_VALIDATION));
		}
		applyDto(template, dto);
		return TemplateDto.from(template);
	}

	@Transactional
	public void delete(Long id) throws BusinessException {
		TemplateEntity template = findEntityById(id);
		long usageCount = subscriptionRepository.count("template.id", id);
		if (usageCount > 0) {
			throw new BusinessException(messages.get(MsgKey.TEMPLATE_IN_USE, usageCount));
		}
		templateRepository.delete(template);
	}

	// -------------------------------------------------------------------------
	// Internal helpers
	// -------------------------------------------------------------------------

	private void applyDto(TemplateEntity template, TemplateDto dto) throws BusinessException {
		template.name = dto.name();
		template.description = dto.description();

		templateValidator.validate(template);

		template.eventType = dto.eventType();
		template.modifierType = dto.modifierType();
		template.modifierValue = dto.modifierValue();

		template.originNode = dto.originNodeId() != null
				? financeNodeService.findNodeEntity(dto.originNodeId())
				: null;

		template.destinationNode = dto.destinationNodeId() != null
				? financeNodeService.findNodeEntity(dto.destinationNodeId())
				: null;

		template.category = (dto.category() != null && dto.category().id() != null)
				? categoryService.findEntityById(dto.category().id())
				: null;

		List<TagEntity> tags = new ArrayList<>();
		if (dto.tags() != null) {
			for (var tagDto : dto.tags()) {
				tags.add(tagService.findTagEntity(tagDto.id()));
			}
		}
		template.tags = tags;
	}
}
