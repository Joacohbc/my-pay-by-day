package com.mypaybyday.service;

import com.mypaybyday.dto.PagedResponse;
import com.mypaybyday.dto.SubscriptionDto;
import com.mypaybyday.entity.Subscription;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.SubscriptionRepository;
import io.quarkus.panache.common.Page;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.util.List;

@ApplicationScoped
public class SubscriptionService {

    @Inject
    SubscriptionRepository subscriptionRepository;

    @Inject
    TemplateService templateService;

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
        if (dto.templateId() == null) {
            throw new BusinessException(messages.get(MsgKey.SUBSCRIPTION_TEMPLATE_REQUIRED));
        }

        Subscription subscription = new Subscription();
        subscription.name = dto.name();
        subscription.template = templateService.findEntityById(dto.templateId());
        subscription.recurrence = dto.recurrence();
        subscription.nextExecutionDate = dto.nextExecutionDate();

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
        if (dto.templateId() != null) {
            subscription.template = templateService.findEntityById(dto.templateId());
        }
        if (dto.recurrence() != null) {
            subscription.recurrence = dto.recurrence();
        }
        if (dto.nextExecutionDate() != null) {
            subscription.nextExecutionDate = dto.nextExecutionDate();
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
