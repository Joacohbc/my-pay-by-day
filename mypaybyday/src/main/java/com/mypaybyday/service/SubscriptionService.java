package com.mypaybyday.service;

import com.mypaybyday.dto.PagedResponse;
import com.mypaybyday.dto.SubscriptionDto;
import com.mypaybyday.dto.TagDto;
import com.mypaybyday.entity.Subscription;
import com.mypaybyday.entity.Tag;
import com.mypaybyday.enums.SubscriptionStatus;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.SubscriptionRepository;
import io.quarkus.panache.common.Page;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.util.ArrayList;
import java.util.List;

@ApplicationScoped
public class SubscriptionService {

    @Inject
    SubscriptionRepository subscriptionRepository;

    @Inject
    FinanceNodeService financeNodeService;

    @Inject
    CategoryService categoryService;

    @Inject
    TagService tagService;

    @Inject
    Messages messages;

    @Transactional
    public PagedResponse<SubscriptionDto> listAll(int page, int size) {
        long totalElements = subscriptionRepository.count();
        List<SubscriptionDto> content = subscriptionRepository.findAll()
                .page(Page.of(page, size))
                .stream()
                .map(SubscriptionDto::from)
                .toList();
        return PagedResponse.of(content, page, size, totalElements);
    }

    @Transactional
    public SubscriptionDto findById(Long id) throws BusinessException {
        Subscription subscription = subscriptionRepository.findById(id);
        if (subscription == null) {
            throw new BusinessException(messages.get(MsgKey.SUBSCRIPTION_NOT_FOUND, id));
        }
        return SubscriptionDto.from(subscription);
    }

    @Transactional
    public SubscriptionDto create(SubscriptionDto dto) throws BusinessException {
        if (dto.name() == null || dto.name().isBlank()) {
            throw new BusinessException(messages.get(MsgKey.SUBSCRIPTION_NAME_REQUIRED));
        }
        if (dto.nextExecutionDate() == null) {
             throw new BusinessException(messages.get(MsgKey.SUBSCRIPTION_NEXT_EXECUTION_DATE_REQUIRED));
        }
        if (dto.recurrence() == null) {
             throw new BusinessException(messages.get(MsgKey.SUBSCRIPTION_RECURRENCE_REQUIRED));
        }

        Subscription subscription = new Subscription();
        subscription.name = dto.name();
        subscription.description = dto.description();
        subscription.eventType = dto.eventType();
        subscription.modifierType = dto.modifierType();
        subscription.modifierValue = dto.modifierValue();
        subscription.recurrence = dto.recurrence();
        subscription.nextExecutionDate = dto.nextExecutionDate();
        subscription.status = dto.status() != null ? dto.status() : SubscriptionStatus.ACTIVE;

        if (dto.originNodeId() != null) {
            subscription.originNode = financeNodeService.findNodeEntity(dto.originNodeId());
        }
        if (dto.destinationNodeId() != null) {
            subscription.destinationNode = financeNodeService.findNodeEntity(dto.destinationNodeId());
        }
        if (dto.category() != null && dto.category().id() != null) {
            subscription.category = categoryService.findEntityById(dto.category().id());
        }

        subscription.tags = new ArrayList<>();
        if (dto.tags() != null) {
            for (TagDto tagDto : dto.tags()) {
                if (tagDto.id() == null) {
                    throw new BusinessException(messages.get(MsgKey.EVENT_TAGS_ID_REQUIRED));
                }
                Tag tag = tagService.findTagEntity(tagDto.id());
                subscription.tags.add(tag);
            }
        }

        subscriptionRepository.persist(subscription);
        return SubscriptionDto.from(subscription);
    }

    @Transactional
    public SubscriptionDto update(Long id, SubscriptionDto dto) throws BusinessException {
        Subscription subscription = subscriptionRepository.findById(id);
        if (subscription == null) {
            throw new BusinessException(messages.get(MsgKey.SUBSCRIPTION_NOT_FOUND, id));
        }

        if (dto.name() != null && !dto.name().isBlank()) {
            subscription.name = dto.name();
        }
        if (dto.description() != null) {
            subscription.description = dto.description();
        }
        if (dto.eventType() != null) {
            subscription.eventType = dto.eventType();
        }
        if (dto.modifierType() != null) {
            subscription.modifierType = dto.modifierType();
        }
        if (dto.modifierValue() != null) {
            subscription.modifierValue = dto.modifierValue();
        }
        if (dto.recurrence() != null) {
            subscription.recurrence = dto.recurrence();
        }
        if (dto.nextExecutionDate() != null) {
            subscription.nextExecutionDate = dto.nextExecutionDate();
        }
        if (dto.status() != null) {
            subscription.status = dto.status();
        }

        if (dto.originNodeId() != null) {
            subscription.originNode = financeNodeService.findNodeEntity(dto.originNodeId());
        } else if (dto.originNodeName() == null && dto.originNodeId() == null && dto.eventType() != null) {
             // Let the frontend clear it out, or we could just skip if the frontend sends partial.
             // We'll only clear if it's explicitly sent as a full update without node. For PATCH semantics:
        }

        // Proper Patch semantics for nodes
        if (dto.originNodeId() != null) {
             subscription.originNode = financeNodeService.findNodeEntity(dto.originNodeId());
        }

        if (dto.destinationNodeId() != null) {
             subscription.destinationNode = financeNodeService.findNodeEntity(dto.destinationNodeId());
        }

        if (dto.category() != null) {
            if (dto.category().id() != null) {
                 subscription.category = categoryService.findEntityById(dto.category().id());
            } else {
                 subscription.category = null;
            }
        }

        if (dto.tags() != null) {
            subscription.tags = new ArrayList<>();
            for (TagDto tagDto : dto.tags()) {
                if (tagDto.id() == null) {
                    throw new BusinessException(messages.get(MsgKey.EVENT_TAGS_ID_REQUIRED));
                }
                Tag tag = tagService.findTagEntity(tagDto.id());
                subscription.tags.add(tag);
            }
        }

        return SubscriptionDto.from(subscription);
    }

    @Transactional
    public void delete(Long id) throws BusinessException {
        Subscription subscription = subscriptionRepository.findById(id);
        if (subscription == null) {
            throw new BusinessException(messages.get(MsgKey.SUBSCRIPTION_NOT_FOUND, id));
        }
        subscriptionRepository.delete(subscription);
    }
}
