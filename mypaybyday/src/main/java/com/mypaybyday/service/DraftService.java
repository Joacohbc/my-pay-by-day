package com.mypaybyday.service;

import java.lang.reflect.Field;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mypaybyday.dto.FinanceEventDraftInputDto;
import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.entity.CategoryEntity;
import com.mypaybyday.entity.DraftEntity;
import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.entity.FinanceLineItemEntity;
import com.mypaybyday.entity.FinanceNodeEntity;
import com.mypaybyday.entity.FinanceTransactionEntity;
import com.mypaybyday.entity.TagEntity;
import com.mypaybyday.enums.EntityType;
import com.mypaybyday.enums.EventType;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.EntityDraftRepository;
import com.mypaybyday.service.event.EventCreateService;

@ApplicationScoped
public class DraftService {

	private final EntityDraftRepository draftRepository;
	private final Messages messages;
	private final ObjectMapper objectMapper;
	private final EventCreateService eventCreateService;

	@Inject
	public DraftService(EntityDraftRepository draftRepository, Messages messages, ObjectMapper objectMapper,
			EventCreateService eventCreateService) {
		this.draftRepository = draftRepository;
		this.messages = messages;
		this.objectMapper = objectMapper;
		this.eventCreateService = eventCreateService;
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
	public DraftEntity createFinanceEventDraft(FinanceEventDraftInputDto input) throws BusinessException {
		FinanceEventDto dto = buildFinanceEventDto(input, null);
		return create(EntityType.FINANCE_EVENT, dto);
	}

	@Transactional
	public DraftEntity patchFinanceEventDraft(Long id, FinanceEventDraftInputDto patch) throws BusinessException {
		DraftEntity entity = findEntityById(id);
		FinanceEventDto current = mapToFinanceEventDto(entity);
		FinanceEventDto updated = buildFinanceEventDto(patch, current);
		try {
			entity.setRawPayloadJson(objectMapper.writeValueAsString(updated));
			if (updated.id() != null) {
				entity.setOriginalEntityId(updated.id());
			}
			draftRepository.persist(entity);
		} catch (JsonProcessingException e) {
			throw new BusinessException(messages.get(MsgKey.DRAFT_INVALID_PAYLOAD));
		}
		return entity;
	}

	private FinanceEventDto buildFinanceEventDto(FinanceEventDraftInputDto input, FinanceEventDto current) {
		String name = input.name() != null ? input.name() : (current != null ? current.name() : null);
		String desc = input.description() != null ? input.description() : (current != null ? current.description() : null);
		EventType type = input.type() != null ? input.type() : (current != null ? current.type() : null);
		java.time.LocalDateTime date = input.transactionDate() != null ? input.transactionDate() : (current != null ? current.transactionDate() : null);
		
		com.mypaybyday.dto.CategoryDto category = current != null ? current.category() : null;
		if (input.categoryId() != null) {
			category = new com.mypaybyday.dto.CategoryDto(input.categoryId(), null, null, null, false);
		}
		
		List<com.mypaybyday.dto.TagDto> tags = current != null ? current.tags() : List.of();
		if (input.tagIds() != null) {
			tags = input.tagIds().stream().map(com.mypaybyday.dto.TagDto::ofId).toList();
		}

		List<com.mypaybyday.dto.FinanceLineItemDto> lineItems = current != null ? current.lineItems() : List.of();
		java.math.BigDecimal amount = current != null ? current.amount() : java.math.BigDecimal.ZERO;
		
		if (input.lineItems() != null && !input.lineItems().isEmpty()) {
			lineItems = input.lineItems();
		} else if (Boolean.TRUE.equals(input.isSimplifiedMode()) || input.amount() != null || input.sourceNodeId() != null || input.destNodeId() != null) {
			Long sourceNodeId = input.sourceNodeId();
			Long destNodeId = input.destNodeId();
			java.math.BigDecimal inputAmount = input.amount();
			
			if (current != null && current.lineItems() != null && !current.lineItems().isEmpty()) {
				if (sourceNodeId == null) {
					sourceNodeId = current.lineItems().stream()
						.filter(li -> li.amount() != null && li.amount().compareTo(java.math.BigDecimal.ZERO) < 0)
						.map(com.mypaybyday.dto.FinanceLineItemDto::financeNodeId)
						.findFirst().orElse(null);
				}
				if (destNodeId == null) {
					destNodeId = current.lineItems().stream()
						.filter(li -> li.amount() != null && li.amount().compareTo(java.math.BigDecimal.ZERO) > 0)
						.map(com.mypaybyday.dto.FinanceLineItemDto::financeNodeId)
						.findFirst().orElse(null);
				}
				if (inputAmount == null) {
					inputAmount = current.amount();
				}
			}
			
			if (inputAmount == null) inputAmount = java.math.BigDecimal.ZERO;
			
			com.mypaybyday.dto.FinanceLineItemDto sourceItem = new com.mypaybyday.dto.FinanceLineItemDto(sourceNodeId, null, null, inputAmount.abs().negate());
			com.mypaybyday.dto.FinanceLineItemDto destItem = new com.mypaybyday.dto.FinanceLineItemDto(destNodeId, null, null, inputAmount.abs());
			lineItems = List.of(sourceItem, destItem);
		}
		
		Long origId = input.id() != null ? input.id() : (current != null ? current.id() : null);

		return new FinanceEventDto(origId, name, desc, type, amount, current != null ? current.transactionId() : null, date, lineItems, category, tags, current != null ? current.relatedEvents() : null, current != null ? current.subscriptionId() : null, current != null ? current.draftId() : null, current != null ? current.files() : null);
	}

	@Transactional
	public void delete(Long id) {
		DraftEntity entity = draftRepository.findById(id);
		if (entity != null) {
			draftRepository.delete(entity);
		}
	}

	@Transactional
	public FinanceEventDto confirmDraft(Long draftId) throws BusinessException {
		List<FinanceEventDto> drafts = listFinanceEventDrafts();
		FinanceEventDto dto = drafts.stream()
				.filter(d -> draftId.equals(d.draftId()))
				.findFirst()
				.orElse(null);
		if (dto == null) throw new BusinessException(messages.get(MsgKey.DRAFT_NOT_FOUND, draftId));
		if (dto.name() == null || dto.name().isBlank())
			throw new BusinessException("Draft is missing a name");
		if (dto.transactionDate() == null)
			throw new BusinessException("Draft is missing a transaction date");
		if (dto.lineItems() == null || dto.lineItems().isEmpty())
			throw new BusinessException("Draft has no line items");

		FinanceEventEntity event = new FinanceEventEntity();
		event.name = dto.name();
		event.description = dto.description();
		event.type = dto.type() != null ? dto.type() : EventType.OUTBOUND;

		if (dto.category() != null && dto.category().id() != null) {
			CategoryEntity cat = new CategoryEntity();
			cat.id = dto.category().id();
			event.category = cat;
		}

		if (dto.tags() != null) {
			event.tags = dto.tags().stream()
					.filter(t -> t.id() != null)
					.map(t -> {
						TagEntity tag = new TagEntity();
						tag.id = t.id();
						return tag;
					})
					.collect(Collectors.toSet());
		}

		FinanceTransactionEntity tx = new FinanceTransactionEntity();
		tx.transactionDate = dto.transactionDate();

		Set<FinanceLineItemEntity> lineItems = new HashSet<>();
		for (var li : dto.lineItems()) {
			FinanceLineItemEntity item = new FinanceLineItemEntity();
			item.setAmount(li.amount());
			if (li.financeNodeId() != null) {
				FinanceNodeEntity node = new FinanceNodeEntity();
				node.id = li.financeNodeId();
				item.financeNode = node;
			}
			item.transaction = tx;
			lineItems.add(item);
		}
		tx.lineItems = lineItems;
		event.transaction = tx;

		FinanceEventDto created = eventCreateService.create(event);
		delete(draftId);
		return created;
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
