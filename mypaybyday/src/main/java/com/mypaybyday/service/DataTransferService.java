package com.mypaybyday.service;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.Base64;
import java.io.InputStream;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;
import java.util.zip.ZipEntry;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.core.StreamingOutput;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import com.mypaybyday.dto.CategoryDto;
import com.mypaybyday.dto.DataTransferDto;
import com.mypaybyday.dto.DataTransferResult;
import com.mypaybyday.dto.FileExportDto;
import com.mypaybyday.dto.FileDto;
import com.mypaybyday.dto.SubscriptionDto;
import com.mypaybyday.dto.TemplateDto;
import com.mypaybyday.dto.TimePeriodDto;
import com.mypaybyday.dto.TimePeriodBudgetDto;
import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.FinanceLineItemDto;
import com.mypaybyday.dto.FinanceNodeDto;
import com.mypaybyday.dto.TagDto;
import com.mypaybyday.dto.TagGroupDto;
import com.mypaybyday.dto.DuplicateDetectionSettingsDto;
import com.mypaybyday.entity.CategoryEntity;
import com.mypaybyday.entity.FileEntity;
import com.mypaybyday.entity.SubscriptionEntity;
import com.mypaybyday.entity.TemplateEntity;
import com.mypaybyday.entity.TimePeriodEntity;
import com.mypaybyday.entity.TimePeriodBudgetEntity;
import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.entity.FinanceLineItemEntity;
import com.mypaybyday.entity.FinanceNodeEntity;
import com.mypaybyday.entity.FinanceTransactionEntity;
import com.mypaybyday.entity.TagEntity;
import com.mypaybyday.entity.TagGroupEntity;
import com.mypaybyday.entity.DuplicateDetectionSettingsEntity;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.CategoryRepository;
import com.mypaybyday.repository.EventRepository;
import com.mypaybyday.repository.FinanceNodeRepository;
import com.mypaybyday.repository.SubscriptionRepository;
import com.mypaybyday.repository.TemplateRepository;
import com.mypaybyday.repository.TimePeriodRepository;
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
    private final SubscriptionRepository subscriptionRepository;
    private final TemplateRepository templateRepository;
    private final TimePeriodRepository timePeriodRepository;
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
            SubscriptionRepository subscriptionRepository,
            TemplateRepository templateRepository,
            TimePeriodRepository timePeriodRepository,
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
        this.subscriptionRepository = subscriptionRepository;
        this.templateRepository = templateRepository;
        this.timePeriodRepository = timePeriodRepository;
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

    public StreamingOutput exportAsZip() {
        return os -> {
            try (ZipOutputStream zos = new ZipOutputStream(os)) {
                zos.putNextEntry(new ZipEntry("data.json"));
                DataTransferDto dto = exportAllWithoutBase64();
                ObjectMapper mapper = new ObjectMapper();
                mapper.registerModule(new JavaTimeModule());
                mapper.writeValue(zos, dto);
                zos.closeEntry();

                try (java.util.stream.Stream<FileEntity> filesStream = FileEntity.streamAll()) {
                    filesStream.forEach(file -> {
                        if (file.data != null) {
                            try {
                                zos.putNextEntry(new ZipEntry("files/" + file.id));
                                zos.write(file.data);
                                zos.closeEntry();
                            } catch (Exception e) {
                                throw new RuntimeException(e);
                            }
                        }
                    });
                }
            }
        };
    }

    public DataTransferDto exportAllWithoutBase64() {
        List<TagDto> tags = tagRepository.listAll().stream().map(TagDto::from).toList();
        List<CategoryDto> categories = categoryRepository.listAll().stream().map(CategoryDto::from).toList();
        List<FinanceNodeDto> nodes = financeNodeRepository.listAll().stream().map(FinanceNodeDto::from).toList();
        List<TagGroupDto> tagGroups = tagGroupRepository.listAll().stream().map(TagGroupDto::from).toList();
        List<FinanceEventDto> events = eventRepository.listAll().stream().map(FinanceEventDto::from).toList();

        List<FileExportDto> files = FileEntity.<FileEntity>streamAll().map(f -> FileExportDto.from(f, false)).toList();
        List<SubscriptionDto> subscriptions = subscriptionRepository.listAll().stream().map(SubscriptionDto::from).toList();
        List<TemplateDto> templates = templateRepository.listAll().stream().map(TemplateDto::from).toList();
        List<TimePeriodDto> timePeriods = timePeriodRepository.listAll().stream().map(TimePeriodDto::from).toList();

        DuplicateDetectionSettingsDto settingsDto = null;
        DuplicateDetectionSettingsEntity settingsEntity = DuplicateDetectionSettingsEntity.find("").firstResult();
        if (settingsEntity != null) {
            settingsDto = new DuplicateDetectionSettingsDto();
            settingsDto.id = settingsEntity.id;
            settingsDto.eventTimeThresholdMinutes = settingsEntity.eventTimeThresholdMinutes;
            settingsDto.eventDateWeight = settingsEntity.eventDateWeight;
            settingsDto.eventAmountWeight = settingsEntity.eventAmountWeight;
            settingsDto.eventNodeWeight = settingsEntity.eventNodeWeight;
            settingsDto.eventCategoryWeight = settingsEntity.eventCategoryWeight;
            settingsDto.eventTagWeight = settingsEntity.eventTagWeight;
            settingsDto.eventNameWeight = settingsEntity.eventNameWeight;
            settingsDto.eventTotalThresholdScore = settingsEntity.eventTotalThresholdScore;
            settingsDto.textSimilarityThresholdScore = settingsEntity.textSimilarityThresholdScore;
        }

        return new DataTransferDto(
                DataTransferDto.CURRENT_VERSION,
                LocalDateTime.now(ZoneOffset.UTC),
                tags,
                categories,
                nodes,
                tagGroups,
                events,
                files,
                subscriptions,
                templates,
                timePeriods,
                settingsDto);
    }

    // -------------------------------------------------------------------------
    // Import
    // -------------------------------------------------------------------------

    @Transactional
    public DataTransferResult importAll(DataTransferDto dto) throws BusinessException {
        return importAllInternal(dto);
    }

    public DataTransferResult importFromZip(InputStream zipStream) throws BusinessException {
        try (ZipInputStream zis = new ZipInputStream(zipStream)) {
            ZipEntry entry;
            DataTransferDto dto = null;
            Map<Long, Long> fileIdMap = null;
            DataTransferResult result = null;

            while ((entry = zis.getNextEntry()) != null) {
                if (entry.getName().equals("data.json")) {
                    ObjectMapper mapper = new ObjectMapper();
                    mapper.registerModule(new JavaTimeModule());
                    mapper.configure(com.fasterxml.jackson.core.JsonParser.Feature.AUTO_CLOSE_SOURCE, false);
                    dto = mapper.readValue(zis, DataTransferDto.class);
                    // Import JSON fully first
                    result = importAll(dto);
                    fileIdMap = result.fileIdMap();
                } else if (entry.getName().startsWith("files/") && fileIdMap != null) {
                    String oldIdStr = entry.getName().substring(6);
                    Long oldId = Long.parseLong(oldIdStr);
                    Long newId = fileIdMap.get(oldId);
                    if (newId != null) {
                        byte[] data = zis.readAllBytes();
                        updateFileData(newId, data);
                    }
                }
                zis.closeEntry();
            }
            return result != null ? result : new DataTransferResult(0, 0, 0, 0, 0, 0, 0, 0, 0, List.of(), Map.of());
        } catch (Exception e) {
            e.printStackTrace();
            throw new jakarta.ws.rs.WebApplicationException("Error reading zip: " + e.getMessage(), 500);
        }
    }

    @Transactional
    public void updateFileData(Long newId, byte[] data) {
        FileEntity entity = FileEntity.findById(newId);
        if (entity != null) {
            entity.data = data;
            try {
                java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
                byte[] hashBytes = md.digest(data);
                entity.hash = java.util.HexFormat.of().formatHex(hashBytes);
            } catch (Exception e) {}
            FileEntity.getEntityManager().persist(entity);
        }
    }

    private DataTransferResult importAllInternal(DataTransferDto dto) throws BusinessException {
        if (dto.duplicateDetectionSettings() != null) {
            DuplicateDetectionSettingsEntity entity = DuplicateDetectionSettingsEntity.find("").firstResult();
            if (entity == null) {
                entity = new DuplicateDetectionSettingsEntity();
            }
            entity.eventTimeThresholdMinutes = dto.duplicateDetectionSettings().eventTimeThresholdMinutes;
            entity.eventDateWeight = dto.duplicateDetectionSettings().eventDateWeight;
            entity.eventAmountWeight = dto.duplicateDetectionSettings().eventAmountWeight;
            entity.eventNodeWeight = dto.duplicateDetectionSettings().eventNodeWeight;
            entity.eventCategoryWeight = dto.duplicateDetectionSettings().eventCategoryWeight;
            entity.eventTagWeight = dto.duplicateDetectionSettings().eventTagWeight;
            entity.eventNameWeight = dto.duplicateDetectionSettings().eventNameWeight;
            entity.eventTotalThresholdScore = dto.duplicateDetectionSettings().eventTotalThresholdScore;
            entity.textSimilarityThresholdScore = dto.duplicateDetectionSettings().textSimilarityThresholdScore;
            DuplicateDetectionSettingsEntity.getEntityManager().persist(entity);
        }

        Map<Long, Long> tagIdMap = importTags(dto.tags());
        Map<Long, Long> categoryIdMap = importCategories(dto.categories());
        Map<Long, Long> nodeIdMap = importNodes(dto.financeNodes());
        Map<Long, Long> fileIdMap = importFiles(dto.files());
        int tagGroupCount = importTagGroups(dto.tagGroups(), tagIdMap);
        Map<Long, Long> subscriptionIdMap = importSubscriptions(dto.subscriptions(), tagIdMap, categoryIdMap, nodeIdMap);
        Map<Long, Long> templateIdMap = importTemplates(dto.templates(), tagIdMap, categoryIdMap, nodeIdMap);
        Map<Long, Long> timePeriodIdMap = importTimePeriods(dto.timePeriods(), categoryIdMap);
        List<String> skippedEvents = new ArrayList<>();
        int eventCount = importEvents(dto.events(), tagIdMap, categoryIdMap, nodeIdMap, fileIdMap, subscriptionIdMap, skippedEvents);

        return new DataTransferResult(
                tagIdMap.size(),
                categoryIdMap.size(),
                nodeIdMap.size(),
                tagGroupCount,
                eventCount,
                fileIdMap.size(),
                subscriptionIdMap.size(),
                templateIdMap.size(),
                timePeriodIdMap.size(),
                skippedEvents,
                fileIdMap);
    }

    private Map<Long, Long> importTags(List<TagDto> dtos) throws BusinessException {
        Map<Long, Long> idMap = new HashMap<>();
        if (dtos == null) return idMap;

        for (TagDto dto : dtos) {
            TagEntity entity = new TagEntity();
            entity.name = dto.name();
            entity.description = dto.description();
            entity.color = dto.color();
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
            entity.color = dto.color();
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
            entity.description = dto.description();
            entity.icon = dto.icon();
            entity.color = dto.color();
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
            Map<Long, Long> fileIdMap,
            Map<Long, Long> subscriptionIdMap,
            List<String> skippedEvents) {
        if (dtos == null) return 0;
        int count = 0;
        Map<Long, FinanceEventEntity> eventIdMap = new HashMap<>();

        for (FinanceEventDto dto : dtos) {
            try {
                FinanceEventEntity newEvent = importSingleEvent(dto, tagIdMap, categoryIdMap, nodeIdMap, fileIdMap, subscriptionIdMap);
                if (dto.id() != null) {
                    eventIdMap.put(dto.id(), newEvent);
                }
                count++;
            } catch (Exception e) {
                Log.warnf("Skipped event '%s': %s", dto.name(), e.getMessage());
                skippedEvents.add("Event '%s': %s".formatted(dto.name(), e.getMessage()));
            }
        }

        for (FinanceEventDto dto : dtos) {
            if (dto.relatedEvents() != null && !dto.relatedEvents().isEmpty() && dto.id() != null) {
                FinanceEventEntity mainEvent = eventIdMap.get(dto.id());
                if (mainEvent != null) {
                    for (com.mypaybyday.dto.RelatedEventDto relatedDto : dto.relatedEvents()) {
                        FinanceEventEntity related = eventIdMap.get(relatedDto.id());
                        if (related != null) {
                            mainEvent.relatedEvents.add(related);
                        }
                    }
                    eventRepository.persist(mainEvent);
                }
            }
        }

        return count;
    }

    private FinanceEventEntity importSingleEvent(
            FinanceEventDto dto,
            Map<Long, Long> tagIdMap,
            Map<Long, Long> categoryIdMap,
            Map<Long, Long> nodeIdMap,
            Map<Long, Long> fileIdMap,
            Map<Long, Long> subscriptionIdMap) throws BusinessException {

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

        if (dto.files() != null) {
            for (FileDto fDto : dto.files()) {
                Long newFileId = fileIdMap.get(fDto.id());
                if (newFileId != null) {
                    FileEntity fEntity = FileEntity.findById(newFileId);
                    if (fEntity != null) event.files.add(fEntity);
                }
            }
        }

        if (dto.subscriptionId() != null) {
            Long newSubId = subscriptionIdMap.get(dto.subscriptionId());
            if (newSubId != null) {
                event.subscription = subscriptionRepository.findById(newSubId);
            }
        }

        regexValidator.validateNameAndDescription(event.name, event.description);
        eventRepository.persist(event);
        return event;
    }
    private Map<Long, Long> importFiles(List<FileExportDto> dtos) {
        Map<Long, Long> idMap = new HashMap<>();
        if (dtos == null) return idMap;

        for (FileExportDto dto : dtos) {
            FileEntity entity = new FileEntity();
            entity.fileName = dto.fileName();
            entity.mimeType = dto.mimeType();
            entity.size = dto.size();
            entity.markdownContent = dto.markdownContent();
            if (dto.base64Content() != null && !dto.base64Content().isEmpty()) {
                entity.data = Base64.getDecoder().decode(dto.base64Content());
                try {
                    java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
                    byte[] hashBytes = md.digest(entity.data);
                    entity.hash = java.util.HexFormat.of().formatHex(hashBytes);
                } catch (java.security.NoSuchAlgorithmException e) {
                    throw new RuntimeException(e);
                }
            }
            FileEntity.getEntityManager().persist(entity);
            if (dto.id() != null) {
                idMap.put(dto.id(), entity.id);
            }
        }
        return idMap;
    }

    private Map<Long, Long> importSubscriptions(List<SubscriptionDto> dtos, Map<Long, Long> tagIdMap, Map<Long, Long> categoryIdMap, Map<Long, Long> nodeIdMap) {
        Map<Long, Long> idMap = new HashMap<>();
        if (dtos == null) return idMap;
        for (SubscriptionDto dto : dtos) {
            SubscriptionEntity entity = new SubscriptionEntity();
            entity.name = dto.name();
            entity.description = dto.description();
            entity.eventType = dto.eventType();
            entity.modifierValue = dto.modifierValue();
            entity.recurrence = dto.recurrence();
            entity.nextExecutionDate = dto.nextExecutionDate();
            entity.status = dto.status();

            if (dto.originNodeId() != null) {
                Long newNodeId = nodeIdMap.get(dto.originNodeId());
                if (newNodeId != null) entity.originNode = financeNodeRepository.findById(newNodeId);
            }
            if (dto.destinationNodeId() != null) {
                Long newNodeId = nodeIdMap.get(dto.destinationNodeId());
                if (newNodeId != null) entity.destinationNode = financeNodeRepository.findById(newNodeId);
            }
            if (dto.category() != null && dto.category().id() != null) {
                Long newCategoryId = categoryIdMap.get(dto.category().id());
                if (newCategoryId != null) entity.category = categoryRepository.findById(newCategoryId);
            }
            if (dto.tags() != null) {
                for (TagDto tagDto : dto.tags()) {
                    Long newTagId = tagIdMap.get(tagDto.id());
                    if (newTagId != null) {
                        TagEntity tag = tagRepository.findById(newTagId);
                        if (tag != null) entity.tags.add(tag);
                    }
                }
            }
            subscriptionRepository.persist(entity);
            if (dto.id() != null) {
                idMap.put(dto.id(), entity.id);
            }
        }
        return idMap;
    }

    private Map<Long, Long> importTemplates(List<TemplateDto> dtos, Map<Long, Long> tagIdMap, Map<Long, Long> categoryIdMap, Map<Long, Long> nodeIdMap) {
        Map<Long, Long> idMap = new HashMap<>();
        if (dtos == null) return idMap;
        for (TemplateDto dto : dtos) {
            TemplateEntity entity = new TemplateEntity();
            entity.name = dto.name();
            entity.description = dto.description();
            entity.eventType = dto.eventType();
            entity.modifierType = dto.modifierType();
            entity.modifierValue = dto.modifierValue();

            if (dto.originNodeId() != null) {
                Long newNodeId = nodeIdMap.get(dto.originNodeId());
                if (newNodeId != null) entity.originNode = financeNodeRepository.findById(newNodeId);
            }
            if (dto.destinationNodeId() != null) {
                Long newNodeId = nodeIdMap.get(dto.destinationNodeId());
                if (newNodeId != null) entity.destinationNode = financeNodeRepository.findById(newNodeId);
            }
            if (dto.category() != null && dto.category().id() != null) {
                Long newCategoryId = categoryIdMap.get(dto.category().id());
                if (newCategoryId != null) entity.category = categoryRepository.findById(newCategoryId);
            }
            if (dto.tags() != null) {
                for (TagDto tagDto : dto.tags()) {
                    Long newTagId = tagIdMap.get(tagDto.id());
                    if (newTagId != null) {
                        TagEntity tag = tagRepository.findById(newTagId);
                        if (tag != null) entity.tags.add(tag);
                    }
                }
            }
            templateRepository.persist(entity);
            if (dto.id() != null) {
                idMap.put(dto.id(), entity.id);
            }
        }
        return idMap;
    }

    private Map<Long, Long> importTimePeriods(List<TimePeriodDto> dtos, Map<Long, Long> categoryIdMap) {
        Map<Long, Long> idMap = new HashMap<>();
        if (dtos == null) return idMap;
        for (TimePeriodDto dto : dtos) {
            TimePeriodEntity entity = new TimePeriodEntity();
            entity.name = dto.name();
            entity.startDate = dto.startDate();
            entity.endDate = dto.endDate();
            entity.savingsPercentageGoal = dto.savingsPercentageGoal();
            entity.budgetLimit = dto.budgetLimit();

            if (dto.budgets() != null) {
                for (TimePeriodBudgetDto budgetDto : dto.budgets()) {
                    Long newCategoryId = budgetDto.category() != null ? categoryIdMap.get(budgetDto.category().id()) : null;
                    if (newCategoryId != null) {
                        CategoryEntity cat = categoryRepository.findById(newCategoryId);
                        if (cat != null) {
                            TimePeriodBudgetEntity budget = new TimePeriodBudgetEntity();
                            budget.timePeriod = entity;
                            budget.category = cat;
                            budget.budgetedAmount = budgetDto.budgetedAmount();
                            entity.budgets.add(budget);
                        }
                    }
                }
            }
            timePeriodRepository.persist(entity);
            if (dto.id() != null) {
                idMap.put(dto.id(), entity.id);
            }
        }
        return idMap;
    }
}
