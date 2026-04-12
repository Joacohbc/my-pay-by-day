package com.mypaybyday.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.entity.DraftEntity;
import com.mypaybyday.enums.EntityType;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.EntityDraftRepository;

import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Optional;

@ApplicationScoped
public class DraftService {

	private final EntityDraftRepository draftRepository;
	private final Messages messages;
	private final ObjectMapper objectMapper;

	@Inject
	public DraftService(EntityDraftRepository draftRepository, Messages messages, ObjectMapper objectMapper) {
		this.draftRepository = draftRepository;
		this.messages = messages;
		this.objectMapper = objectMapper;
	}

	public List<DraftEntity> listAll() {
		return draftRepository.listAll();
	}

	public List<DraftEntity> listByEntityType(EntityType type) {
		return draftRepository.find("entityType", type).list();
	}

	public List<FinanceEventDto> listFinanceEventDrafts() {
		return listByEntityType(EntityType.FINANCE_EVENT).stream()
			.map(this::mapToFinanceEventDto)
			.toList();
	}

	public Optional<FinanceEventDto> findFinanceEventDraftByEntityId(Long originalEntityId) {
		return draftRepository.findByOriginalEntityIdAndType(originalEntityId, EntityType.FINANCE_EVENT)
			.map(this::mapToFinanceEventDto);
	}


	public DraftEntity findById(Long id) throws BusinessException {
		return findEntityById(id);
	}

	@Transactional
	public DraftEntity create(EntityType entityType, Object payload) throws BusinessException {
		DraftEntity entity = new DraftEntity();
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
	public DraftEntity update(Long id, Object payload) throws BusinessException {
		DraftEntity entity = findEntityById(id);

		if (payload != null) {
			Class<?> entityClass = resolvePayloadClass(entity.getEntityType());
			Long extractedId = extractId(payload, entityClass);
			if (extractedId != null) {
				entity.setOriginalEntityId(extractedId);
			}
			try {
				entity.setRawPayloadJson(objectMapper.writeValueAsString(payload));
				draftRepository.persist(entity);
			} catch (JsonProcessingException e) {
				throw new BusinessException(messages.get(MsgKey.DRAFT_INVALID_PAYLOAD));
			}
		}

		return entity;
	}

	@Transactional
	public void delete(Long id) {
		DraftEntity entity = draftRepository.findById(id);
		if (entity != null) {
			draftRepository.delete(entity);
		}
	}

	@Transactional
	public void deleteFinanceEventDrafts() {
		draftRepository.delete("entityType", EntityType.FINANCE_EVENT);
	}

	@Transactional
	public long deleteByOriginalEntityId(Long originalEntityId, EntityType entityType) {
		return draftRepository.deleteByOriginalEntityIdAndType(originalEntityId, entityType);
	}

	private DraftEntity findEntityById(Long id) throws BusinessException {
		DraftEntity entity = draftRepository.findById(id);
		if (entity == null) {
			throw new BusinessException(messages.get(MsgKey.DRAFT_NOT_FOUND, id));
		}
		return entity;
	}

	private FinanceEventDto mapToFinanceEventDto(DraftEntity entity) {
		try {
			FinanceEventDto dto = objectMapper.readValue(entity.getRawPayloadJson(), FinanceEventDto.class);
			return dto.fromDraft(entity.getOriginalEntityId(), entity.id);
		} catch (JsonProcessingException e) {
			throw new BusinessException(messages.get(MsgKey.DRAFT_INVALID_PAYLOAD));
		}
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
