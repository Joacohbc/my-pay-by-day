package com.mypaybyday.service;

import com.mypaybyday.dto.TemplateDto;
import com.mypaybyday.entity.Tag;
import com.mypaybyday.entity.Template;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.repository.SubscriptionRepository;
import com.mypaybyday.repository.TemplateRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.util.ArrayList;
import java.util.List;

@ApplicationScoped
public class TemplateService {

    @Inject
    TemplateRepository templateRepository;

    @Inject
    SubscriptionRepository subscriptionRepository;

    @Inject
    CategoryService categoryService;

    @Inject
    TagService tagService;

    @Inject
    FinanceNodeService financeNodeService;

    // -------------------------------------------------------------------------
    // Queries
    // -------------------------------------------------------------------------

    public List<TemplateDto> listAll() {
        return templateRepository.listAll().stream().map(TemplateDto::from).toList();
    }

    public TemplateDto findById(Long id) throws BusinessException {
        return TemplateDto.from(findEntityById(id));
    }

    /**
     * Internal method used by other services that need a managed {@link Template} entity
     * (e.g. {@link SubscriptionService} when resolving a template reference).
     */
    Template findEntityById(Long id) throws BusinessException {
        Template template = templateRepository.findById(id);
        if (template == null) {
            throw new BusinessException("Template not found: " + id);
        }
        return template;
    }

    // -------------------------------------------------------------------------
    // Commands
    // -------------------------------------------------------------------------

    @Transactional
    public TemplateDto create(TemplateDto dto) throws BusinessException {
        if (dto.name() == null || dto.name().isBlank()) {
            throw new BusinessException("Template name must not be blank");
        }
        Template template = new Template();
        applyDto(template, dto);
        templateRepository.persist(template);
        return TemplateDto.from(template);
    }

    @Transactional
    public TemplateDto update(Long id, TemplateDto dto) throws BusinessException {
        Template template = findEntityById(id);
        if (dto.name() == null || dto.name().isBlank()) {
            throw new BusinessException("Template name must not be blank");
        }
        applyDto(template, dto);
        return TemplateDto.from(template);
    }

    @Transactional
    public void delete(Long id) throws BusinessException {
        Template template = findEntityById(id);
        long usageCount = subscriptionRepository.count("template.id", id);
        if (usageCount > 0) {
            throw new BusinessException(
                    "Template is referenced by " + usageCount + " subscription(s) and cannot be deleted");
        }
        templateRepository.delete(template);
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    private void applyDto(Template template, TemplateDto dto) throws BusinessException {
        template.name = dto.name();
        template.description = dto.description();
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

        List<Tag> tags = new ArrayList<>();
        if (dto.tags() != null) {
            for (var tagDto : dto.tags()) {
                tags.add(tagService.findTagEntity(tagDto.id()));
            }
        }
        template.tags = tags;
    }
}
