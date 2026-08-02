package com.mypaybyday.service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.PagedResponse;
import com.mypaybyday.dto.SectionImportResult;
import com.mypaybyday.dto.TagDto;
import com.mypaybyday.dto.TemplateDto;
import com.mypaybyday.entity.TagEntity;
import com.mypaybyday.entity.TemplateEntity;
import com.mypaybyday.enums.DataSection;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.TemplateRepository;
import com.mypaybyday.service.transfer.ArchivedItemImporter;
import com.mypaybyday.service.transfer.DataSectionTransfer;
import com.mypaybyday.service.transfer.ImportContext;
import com.mypaybyday.validation.TemplateValidator;
import io.quarkus.logging.Log;
import io.quarkus.panache.common.Page;

@ApplicationScoped
public class TemplateService implements DataSectionTransfer<TemplateDto> {

	private final TemplateRepository templateRepository;
	private final CategoryService categoryService;
	private final TagService tagService;
	private final FinanceNodeService financeNodeService;
	private final Messages messages;
	private final TemplateValidator templateValidator;
	private final ArchivedItemImporter archivedItemImporter;

	public TemplateService(
			TemplateRepository templateRepository,
			CategoryService categoryService,
			TagService tagService,
			FinanceNodeService financeNodeService,
			Messages messages,
			TemplateValidator templateValidator,
			ArchivedItemImporter archivedItemImporter) {
		this.templateRepository = templateRepository;
		this.categoryService = categoryService;
		this.tagService = tagService;
		this.financeNodeService = financeNodeService;
		this.messages = messages;
		this.templateValidator = templateValidator;
		this.archivedItemImporter = archivedItemImporter;
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
			throw messages.reject(MsgKey.TEMPLATE_NOT_FOUND, id);
		}
		return template;
	}

	// -------------------------------------------------------------------------
	// Commands
	// -------------------------------------------------------------------------

	@Transactional
	public TemplateDto create(TemplateDto dto) throws BusinessException {
		if (dto.name() == null || dto.name().isBlank()) {
			throw messages.reject(MsgKey.TEMPLATE_NAME_REQUIRED);
		}
		if ((dto.modifierType() != null && dto.modifierValue() == null) ||
			(dto.modifierType() == null && dto.modifierValue() != null)) {
			throw messages.reject(MsgKey.TEMPLATE_MODIFIER_VALIDATION);
		}
		TemplateEntity template = new TemplateEntity();
		applyDto(template, dto);
		templateRepository.persist(template);
		Log.infof("Created template id=%d", template.id);
		return TemplateDto.from(template);
	}

	@Transactional
	public TemplateDto update(Long id, TemplateDto dto) throws BusinessException {
		TemplateEntity template = findEntityById(id);
		if (dto.name() == null || dto.name().isBlank()) {
			throw messages.reject(MsgKey.TEMPLATE_NAME_REQUIRED);
		}
		if ((dto.modifierType() != null && dto.modifierValue() == null) ||
			(dto.modifierType() == null && dto.modifierValue() != null)) {
			throw messages.reject(MsgKey.TEMPLATE_MODIFIER_VALIDATION);
		}
		applyDto(template, dto);
		Log.infof("Updated template id=%d", id);
		return TemplateDto.from(template);
	}

	@Transactional
	public void delete(Long id) throws BusinessException {
		TemplateEntity template = findEntityById(id);
		templateRepository.delete(template);
		Log.infof("Deleted template id=%d", id);
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

		Set<TagEntity> tags = new HashSet<>();
		if (dto.tags() != null) {
			for (var tagDto : dto.tags()) {
				tags.add(tagService.findTagEntity(tagDto.id()));
			}
		}
		template.tags = tags;
	}

	// -------------------------------------------------------------------------
	// Data transfer
	// -------------------------------------------------------------------------

	@Override
	public DataSection section() {
		return DataSection.TEMPLATES;
	}

	@Override
	@Transactional
	public long countForExport() {
		return templateRepository.count();
	}

	@Override
	@Transactional
	public List<TemplateDto> exportData() {
		return templateRepository.listAll().stream().map(TemplateDto::from).toList();
	}

	@Override
	@Transactional
	public SectionImportResult importData(List<TemplateDto> items, ImportContext context) {
		return archivedItemImporter.importEach(section(), items, TemplateDto::name, dto -> {
			TemplateEntity entity = new TemplateEntity();
			entity.name = dto.name();
			entity.description = dto.description();
			entity.eventType = dto.eventType();
			entity.modifierType = dto.modifierType();
			entity.modifierValue = dto.modifierValue();

			if (dto.originNodeId() != null) {
				Long newNodeId = context.remap(DataSection.FINANCE_NODES, dto.originNodeId());
				if (newNodeId != null) {
					entity.originNode = financeNodeService.findNodeEntity(newNodeId);
				}
			}
			if (dto.destinationNodeId() != null) {
				Long newNodeId = context.remap(DataSection.FINANCE_NODES, dto.destinationNodeId());
				if (newNodeId != null) {
					entity.destinationNode = financeNodeService.findNodeEntity(newNodeId);
				}
			}
			if (dto.category() != null && dto.category().id() != null) {
				Long newCategoryId = context.remap(DataSection.CATEGORIES, dto.category().id());
				if (newCategoryId != null) {
					entity.category = categoryService.findEntityById(newCategoryId);
				}
			}
			if (dto.tags() != null) {
				for (TagDto tagDto : dto.tags()) {
					Long newTagId = context.remap(DataSection.TAGS, tagDto.id());
					if (newTagId != null) {
						TagEntity tag = tagService.findTagEntity(newTagId);
						if (tag != null) {
							entity.tags.add(tag);
						}
					}
				}
			}
			templateValidator.validate(entity);
			templateRepository.persist(entity);
			context.rememberId(section(), dto.id(), entity.id);
		});
	}
}
