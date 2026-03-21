package com.mypaybyday.service;

import com.mypaybyday.dto.FinanceEventDraftDto;
import com.mypaybyday.entity.FinanceEventDraft;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.FinanceEventDraftRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.util.List;


@ApplicationScoped
public class FinanceEventDraftService {

    private final FinanceEventDraftRepository draftRepository;
    private final Messages messages;

    @Inject
    public FinanceEventDraftService(FinanceEventDraftRepository draftRepository, Messages messages) {
        this.draftRepository = draftRepository;
        this.messages = messages;
    }

    public List<FinanceEventDraftDto> listAll() {
        return draftRepository.listAll().stream()
                .map(this::toDto)
                .toList();
    }

    public FinanceEventDraftDto findById(Long id) throws BusinessException {
        return toDto(findEntityById(id));
    }

    @Transactional
    public FinanceEventDraftDto create(FinanceEventDraftDto dto) {
        FinanceEventDraft entity = new FinanceEventDraft();
        entity.originalEventId = dto.originalEventId;
        entity.rawPayloadJson = dto.rawPayloadJson;

        draftRepository.persist(entity);
        return toDto(entity);
    }

    @Transactional
    public FinanceEventDraftDto update(Long id, FinanceEventDraftDto dto) throws BusinessException {
        FinanceEventDraft entity = findEntityById(id);

        if (dto.originalEventId != null) {
            entity.originalEventId = dto.originalEventId;
        }
        if (dto.rawPayloadJson != null) {
            entity.rawPayloadJson = dto.rawPayloadJson;
        }

        return toDto(entity);
    }

    @Transactional
    public void delete(Long id) throws BusinessException {
        FinanceEventDraft entity = findEntityById(id);
        draftRepository.delete(entity);
    }

    private FinanceEventDraft findEntityById(Long id) throws BusinessException {
        FinanceEventDraft entity = draftRepository.findById(id);
        if (entity == null) {
            throw new BusinessException(messages.get(MsgKey.DRAFT_NOT_FOUND, id));
        }
        return entity;
    }

    private FinanceEventDraftDto toDto(FinanceEventDraft entity) {
        return FinanceEventDraftDto.builder()
                .id(entity.id)
                .originalEventId(entity.originalEventId)
                .rawPayloadJson(entity.rawPayloadJson)
                .createdAt(entity.createdAt)
                .updatedAt(entity.updatedAt)
                .build();
    }
}
