package com.mypaybyday.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.entity.EntityDraft;
import com.mypaybyday.enums.EntityType;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.EntityDraftRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.lang.reflect.Field;
import java.util.List;

@ApplicationScoped
public class EntityDraftService {

    private final EntityDraftRepository draftRepository;
    private final Messages messages;
    private final ObjectMapper objectMapper;

    @Inject
    public EntityDraftService(EntityDraftRepository draftRepository, Messages messages, ObjectMapper objectMapper) {
        this.draftRepository = draftRepository;
        this.messages = messages;
        this.objectMapper = objectMapper;
    }

    public List<EntityDraft> listAll() {
        return draftRepository.listAll();
    }

    public List<EntityDraft> listByEntityType(EntityType type) {
        return draftRepository.find("entityType", type).list();
    }

    public EntityDraft findById(Long id) throws BusinessException {
        return findEntityById(id);
    }

    @Transactional
    public EntityDraft create(EntityType entityType, Object payload) throws BusinessException {
        EntityDraft entity = new EntityDraft();
        entity.setEntityType(entityType);

        if (payload != null) {
            Class<?> entityClass = resolvePayloadClass(entityType);
            entity.setOriginalEntityId(extractId(payload, entityClass));
            try {
                // Use ObjectMapper to serialize the payload to JSON
                entity.setRawPayloadJson(objectMapper.writeValueAsString(payload));
            } catch (JsonProcessingException e) {
                throw new BusinessException(messages.get(MsgKey.DRAFT_INVALID_PAYLOAD));
            }
        }

        draftRepository.persist(entity);
        return entity;
    }

    @Transactional
    public EntityDraft update(Long id, Object payload) throws BusinessException {
        EntityDraft entity = findEntityById(id);

        if (payload != null) {
            Class<?> entityClass = resolvePayloadClass(entity.getEntityType());
            Long extractedId = extractId(payload, entityClass);
            if (extractedId != null) {
                entity.setOriginalEntityId(extractedId);
            }
            try {
                entity.setRawPayloadJson(objectMapper.writeValueAsString(payload));
            } catch (JsonProcessingException e) {
                throw new BusinessException(messages.get(MsgKey.DRAFT_INVALID_PAYLOAD));
            }
        }

        return entity;
    }

    @Transactional
    public void delete(Long id) throws BusinessException {
        EntityDraft entity = findEntityById(id);
        draftRepository.delete(entity);
    }

    private EntityDraft findEntityById(Long id) throws BusinessException {
        EntityDraft entity = draftRepository.findById(id);
        if (entity == null) {
            throw new BusinessException(messages.get(MsgKey.DRAFT_NOT_FOUND, id));
        }
        return entity;
    }

    /**
     * Resolves the class corresponding to the payload of an EntityType internally.
     */
    private Class<?> resolvePayloadClass(EntityType type) {
        return switch (type) {
            case FINANCE_EVENT -> FinanceEventDto.class;
            default -> Object.class;
        };
    }

    private Long extractId(Object payload, Class<?> payloadClass) {
        if (payload == null || payloadClass == null) return null;
        try {
            Field idField = payloadClass.getDeclaredField("id");
            idField.setAccessible(true);
            Object idVal = idField.get(payload);
            if (idVal instanceof Long longVal) {
                return longVal;
            }
        } catch (Exception e) {
            // Field might not exist or be accessible, ignore
        }
        return null;
    }
}
