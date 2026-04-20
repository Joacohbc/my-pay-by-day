package com.mypaybyday.service;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.CategoryDto;
import com.mypaybyday.dto.DataTransferDto;
import com.mypaybyday.dto.DataTransferResult;
import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.FinanceLineItemDto;
import com.mypaybyday.dto.FinanceNodeDto;
import com.mypaybyday.dto.TagDto;
import com.mypaybyday.dto.TagGroupDto;
import com.mypaybyday.entity.CategoryEntity;
import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.entity.FinanceLineItemEntity;
import com.mypaybyday.entity.FinanceNodeEntity;
import com.mypaybyday.entity.FinanceTransactionEntity;
import com.mypaybyday.entity.TagEntity;
import com.mypaybyday.entity.TagGroupEntity;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.CategoryRepository;
import com.mypaybyday.repository.EventRepository;
import com.mypaybyday.repository.FinanceNodeRepository;
import com.mypaybyday.repository.TagGroupRepository;
import com.mypaybyday.repository.TagRepository;
import com.mypaybyday.repository.TransactionRepository;
import com.mypaybyday.validation.CategoryValidator;
import com.mypaybyday.validation.FinanceNodeValidator;
import com.mypaybyday.validation.RegexValidator;
import com.mypaybyday.validation.TagValidator;
import com.mypaybyday.validation.TransactionValidator;

import io.quarkus.logging.Log;

@ApplicationScoped
public class DataTransferService {

    private final TagRepository tagRepository;
    private final CategoryRepository categoryRepository;
    private final FinanceNodeRepository financeNodeRepository;
    private final TagGroupRepository tagGroupRepository;
    private final EventRepository eventRepository;
    private final TransactionRepository transactionRepository;
    private final TagValidator tagValidator;
    private final CategoryValidator categoryValidator;
    private final FinanceNodeValidator financeNodeValidator;
    private final RegexValidator regexValidator;
    private final TransactionValidator transactionValidator;
    private final Messages messages;

    public DataTransferService(
            TagRepository tagRepository,
            CategoryRepository categoryRepository,
            FinanceNodeRepository financeNodeRepository,
            TagGroupRepository tagGroupRepository,
            EventRepository eventRepository,
            TransactionRepository transactionRepository,
            TagValidator tagValidator,
            CategoryValidator categoryValidator,
            FinanceNodeValidator financeNodeValidator,
            RegexValidator regexValidator,
            TransactionValidator transactionValidator,
            Messages messages) {
        this.tagRepository = tagRepository;
        this.categoryRepository = categoryRepository;
        this.financeNodeRepository = financeNodeRepository;
        this.tagGroupRepository = tagGroupRepository;
        this.eventRepository = eventRepository;
        this.transactionRepository = transactionRepository;
        this.tagValidator = tagValidator;
        this.categoryValidator = categoryValidator;
        this.financeNodeValidator = financeNodeValidator;
        this.regexValidator = regexValidator;
        this.transactionValidator = transactionValidator;
        this.messages = messages;
    }

    // -------------------------------------------------------------------------
    // Export
    // -------------------------------------------------------------------------

    @Transactional
    public DataTransferDto exportAll() {
        List<TagDto> tags = tagRepository.listAll().stream().map(TagDto::from).toList();
        List<CategoryDto> categories = categoryRepository.listAll().stream().map(CategoryDto::from).toList();
        List<FinanceNodeDto> nodes = financeNodeRepository.listAll().stream().map(FinanceNodeDto::from).toList();
        List<TagGroupDto> tagGroups = tagGroupRepository.listAll().stream().map(TagGroupDto::from).toList();
        List<FinanceEventDto> events = eventRepository.listAll().stream().map(FinanceEventDto::from).toList();

        return new DataTransferDto(
                DataTransferDto.CURRENT_VERSION,
                LocalDateTime.now(ZoneOffset.UTC),
                tags,
                categories,
                nodes,
                tagGroups,
                events);
    }

    // -------------------------------------------------------------------------
    // Import
    // -------------------------------------------------------------------------

    @Transactional
    public DataTransferResult importAll(DataTransferDto dto) throws BusinessException {
        Map<Long, Long> tagIdMap = importTags(dto.tags());
        Map<Long, Long> categoryIdMap = importCategories(dto.categories());
        Map<Long, Long> nodeIdMap = importNodes(dto.financeNodes());
        int tagGroupCount = importTagGroups(dto.tagGroups(), tagIdMap);
        List<String> skippedEvents = new ArrayList<>();
        int eventCount = importEvents(dto.events(), tagIdMap, categoryIdMap, nodeIdMap, skippedEvents);

        return new DataTransferResult(
                tagIdMap.size(),
                categoryIdMap.size(),
                nodeIdMap.size(),
                tagGroupCount,
                eventCount,
                skippedEvents);
    }

    private Map<Long, Long> importTags(List<TagDto> dtos) throws BusinessException {
        Map<Long, Long> idMap = new HashMap<>();
        if (dtos == null) return idMap;

        for (TagDto dto : dtos) {
            TagEntity entity = new TagEntity();
            entity.name = dto.name();
            entity.description = dto.description();
            entity.archived = dto.archived();
            tagValidator.validate(entity);
            tagRepository.persist(entity);
            if (dto.id() != null) {
                idMap.put(dto.id(), entity.id);
            }
        }
        return idMap;
    }

    private Map<Long, Long> importCategories(List<CategoryDto> dtos) throws BusinessException {
        Map<Long, Long> idMap = new HashMap<>();
        if (dtos == null) return idMap;

        for (CategoryDto dto : dtos) {
            CategoryEntity entity = new CategoryEntity();
            entity.name = dto.name();
            entity.description = dto.description();
            entity.icon = dto.icon();
            entity.archived = dto.archived();
            categoryValidator.validate(entity);
            categoryRepository.persist(entity);
            if (dto.id() != null) {
                idMap.put(dto.id(), entity.id);
            }
        }
        return idMap;
    }

    private Map<Long, Long> importNodes(List<FinanceNodeDto> dtos) throws BusinessException {
        Map<Long, Long> idMap = new HashMap<>();
        if (dtos == null) return idMap;

        for (FinanceNodeDto dto : dtos) {
            FinanceNodeEntity entity = new FinanceNodeEntity();
            entity.name = dto.name();
            entity.type = dto.type();
            entity.archived = dto.archived();
            financeNodeValidator.validate(entity);
            financeNodeRepository.persist(entity);
            if (dto.id() != null) {
                idMap.put(dto.id(), entity.id);
            }
        }
        return idMap;
    }

    private int importTagGroups(List<TagGroupDto> dtos, Map<Long, Long> tagIdMap) throws BusinessException {
        if (dtos == null) return 0;
        int count = 0;

        for (TagGroupDto dto : dtos) {
            TagGroupEntity entity = new TagGroupEntity();
            entity.name = dto.name();
            entity.description = dto.description();
            entity.icon = dto.icon();
            entity.archived = dto.archived();

            Set<TagEntity> resolvedTags = new HashSet<>();
            if (dto.tags() != null) {
                for (TagDto tagDto : dto.tags()) {
                    Long newTagId = tagIdMap.get(tagDto.id());
                    if (newTagId != null) {
                        TagEntity tag = tagRepository.findById(newTagId);
                        if (tag != null) resolvedTags.add(tag);
                    }
                }
            }
            entity.tags = resolvedTags;

            entity.name = regexValidator.sanitize(entity.name);
            entity.description = regexValidator.sanitize(entity.description);
            regexValidator.validateText(entity.name, RegexValidator.SHORT_MAX_LENGTH);
            regexValidator.validateText(entity.description, RegexValidator.LONG_MAX_LENGTH);
            regexValidator.validateIcon(entity.icon);
            tagGroupRepository.persist(entity);
            count++;
        }
        return count;
    }

    private int importEvents(
            List<FinanceEventDto> dtos,
            Map<Long, Long> tagIdMap,
            Map<Long, Long> categoryIdMap,
            Map<Long, Long> nodeIdMap,
            List<String> skippedEvents) {
        if (dtos == null) return 0;
        int count = 0;

        for (FinanceEventDto dto : dtos) {
            try {
                count += importSingleEvent(dto, tagIdMap, categoryIdMap, nodeIdMap);
            } catch (Exception e) {
                Log.warnf("Skipped event '%s': %s", dto.name(), e.getMessage());
                skippedEvents.add("Event '%s': %s".formatted(dto.name(), e.getMessage()));
            }
        }
        return count;
    }

    private int importSingleEvent(
            FinanceEventDto dto,
            Map<Long, Long> tagIdMap,
            Map<Long, Long> categoryIdMap,
            Map<Long, Long> nodeIdMap) throws BusinessException {

        FinanceTransactionEntity tx = new FinanceTransactionEntity();
        tx.transactionDate = dto.transactionDate();

        if (dto.lineItems() != null) {
            for (FinanceLineItemDto liDto : dto.lineItems()) {
                Long newNodeId = nodeIdMap.get(liDto.financeNodeId());
                if (newNodeId == null) {
                    throw new BusinessException(messages.get(MsgKey.NODE_NOT_FOUND));
                }
                FinanceNodeEntity node = financeNodeRepository.findById(newNodeId);
                if (node == null) {
                    throw new BusinessException(messages.get(MsgKey.NODE_NOT_FOUND));
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
            Long newCategoryId = categoryIdMap.get(dto.category().id());
            if (newCategoryId != null) {
                event.category = categoryRepository.findById(newCategoryId);
            }
        }

        Set<TagEntity> resolvedTags = new HashSet<>();
        if (dto.tags() != null) {
            for (TagDto tagDto : dto.tags()) {
                Long newTagId = tagIdMap.get(tagDto.id());
                if (newTagId != null) {
                    TagEntity tag = tagRepository.findById(newTagId);
                    if (tag != null) resolvedTags.add(tag);
                }
            }
        }
        event.tags = resolvedTags;

        regexValidator.validateNameAndDescription(event.name, event.description);
        eventRepository.persist(event);
        return 1;
    }
}
