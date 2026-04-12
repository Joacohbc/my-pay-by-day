package com.mypaybyday.service;

import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.FinanceLineItemDto;
import com.mypaybyday.dto.PagedResponse;
import com.mypaybyday.dto.SubscriptionDto;
import com.mypaybyday.dto.TagDto;
import com.mypaybyday.entity.CategoryEntity;
import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.entity.FinanceLineItemEntity;
import com.mypaybyday.entity.FinanceNodeEntity;
import com.mypaybyday.entity.FinanceTransactionEntity;
import com.mypaybyday.entity.SubscriptionEntity;
import com.mypaybyday.entity.SystemJobEntity;
import com.mypaybyday.entity.TagEntity;
import com.mypaybyday.enums.JobCategory;
import com.mypaybyday.enums.JobStatus;
import com.mypaybyday.enums.SubscriptionStatus;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.EventRepository;
import com.mypaybyday.repository.SubscriptionRepository;
import com.mypaybyday.repository.SystemJobRepository;
import com.mypaybyday.validation.SubscriptionValidator;
import io.quarkus.panache.common.Page;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.jboss.logging.Logger;

@ApplicationScoped
public class SubscriptionService {

	private static final Logger LOG = Logger.getLogger(SubscriptionService.class);

	@Inject
	SubscriptionRepository subscriptionRepository;

	@Inject
	EventRepository eventRepository;

	@Inject
	FinanceNodeService financeNodeService;

	@Inject
	CategoryService categoryService;

	@Inject
	TagService tagService;

	@Inject
	Messages messages;

	@Inject
	SubscriptionValidator subscriptionValidator;

	@Inject
	EventService eventService;

	@Inject
	SystemJobRepository systemJobRepository;

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
		SubscriptionEntity subscription = subscriptionRepository.findById(id);
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

		SubscriptionEntity subscription = new SubscriptionEntity();
		subscription.name = dto.name();
		subscription.description = dto.description();

		subscriptionValidator.validate(subscription);

		subscription.eventType = dto.eventType();
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
				TagEntity tag = tagService.findTagEntity(tagDto.id());
				subscription.tags.add(tag);
			}
		}

		subscriptionRepository.persist(subscription);

		SystemJobEntity job = new SystemJobEntity();
		job.jobCategory = JobCategory.SUBSCRIPTION_PROCESSOR;
		job.status = JobStatus.PENDING;
		job.nextExecutionDate = subscription.nextExecutionDate;
		job.entityId = String.valueOf(subscription.id);
		systemJobRepository.persist(job);

		return SubscriptionDto.from(subscription);
	}

	@Transactional
	public SubscriptionDto update(Long id, SubscriptionDto dto) throws BusinessException {
		SubscriptionEntity subscription = subscriptionRepository.findById(id);
		if (subscription == null) {
			throw new BusinessException(messages.get(MsgKey.SUBSCRIPTION_NOT_FOUND, id));
		}

		if (dto.name() != null && !dto.name().isBlank()) {
			subscription.name = dto.name();
		}
		if (dto.description() != null) {
			subscription.description = dto.description();
		}

		subscriptionValidator.validate(subscription);

		if (dto.eventType() != null) {
			subscription.eventType = dto.eventType();
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
				TagEntity tag = tagService.findTagEntity(tagDto.id());
				subscription.tags.add(tag);
			}
		}

		SystemJobEntity pendingJob = systemJobRepository.findPendingJobByEntityId(JobCategory.SUBSCRIPTION_PROCESSOR, String.valueOf(subscription.id));
		if (pendingJob != null) {
			if (subscription.status != SubscriptionStatus.ACTIVE) {
				pendingJob.status = JobStatus.COMPLETED;
				pendingJob.message = "Subscription deactivated/paused";
				systemJobRepository.persist(pendingJob);
			} else {
				pendingJob.nextExecutionDate = subscription.nextExecutionDate;
				systemJobRepository.persist(pendingJob);
			}
		} else if (subscription.status == SubscriptionStatus.ACTIVE) {
			// Re-activate or recreate if didn't exist
			SystemJobEntity job = new SystemJobEntity();
			job.jobCategory = JobCategory.SUBSCRIPTION_PROCESSOR;
			job.status = JobStatus.PENDING;
			job.nextExecutionDate = subscription.nextExecutionDate;
			job.entityId = String.valueOf(subscription.id);
			systemJobRepository.persist(job);
		}

		return SubscriptionDto.from(subscription);
	}

	@Transactional
	public void delete(Long id) throws BusinessException {
		SubscriptionEntity subscription = subscriptionRepository.findById(id);
		if (subscription == null) {
			throw new BusinessException(messages.get(MsgKey.SUBSCRIPTION_NOT_FOUND, id));
		}

		SystemJobEntity pendingJob = systemJobRepository.findPendingJobByEntityId(JobCategory.SUBSCRIPTION_PROCESSOR, String.valueOf(subscription.id));
		if (pendingJob != null) {
			pendingJob.status = JobStatus.COMPLETED;
			pendingJob.message = "Subscription deleted";
			systemJobRepository.persist(pendingJob);
		}

		subscriptionRepository.delete(subscription);
	}

	@Transactional
	public void processSubscription(Long subscriptionId) throws BusinessException {
		SubscriptionEntity sub = subscriptionRepository.findById(subscriptionId);
		if (sub == null) {
			throw new BusinessException(messages.get(MsgKey.SUBSCRIPTION_NOT_FOUND, subscriptionId));
		}

		if (sub.status != SubscriptionStatus.ACTIVE) {
			LOG.warnf("Subscription %d is not active, skipping execution.", sub.id);
			return;
		}

		try {
			// Generate the event
			createEventFromSubscription(sub);

			// Update next execution date based on recurrence
			switch (sub.recurrence) {
				case DAILY -> sub.nextExecutionDate = sub.nextExecutionDate.plusDays(1);
				case WEEKLY -> sub.nextExecutionDate = sub.nextExecutionDate.plusWeeks(1);
				case MONTHLY -> sub.nextExecutionDate = sub.nextExecutionDate.plusMonths(1);
				case YEARLY -> sub.nextExecutionDate = sub.nextExecutionDate.plusYears(1);
			}
			subscriptionRepository.persist(sub);

			SystemJobEntity nextJob = new SystemJobEntity();
			nextJob.jobCategory = JobCategory.SUBSCRIPTION_PROCESSOR;
			nextJob.status = JobStatus.PENDING;
			nextJob.nextExecutionDate = sub.nextExecutionDate;
			nextJob.entityId = String.valueOf(sub.id);
			systemJobRepository.persist(nextJob);

		} catch (Exception e) {
			LOG.errorf(e, "Failed to process subscription ID: %d", sub.id);
			throw new BusinessException(messages.get(MsgKey.SUBSCRIPTION_PROCESSING_FAILED, e.getMessage()));
		}
	}

	private void createEventFromSubscription(SubscriptionEntity sub) {
		if (sub.eventType == null || sub.modifierValue == null || sub.originNode == null) {
			LOG.warnf("Subscription %d is missing required fields (eventType, modifierValue, originNode) for event generation. Skipping.", sub.id);
			return;
		}

		// Create Line Items
		List<FinanceLineItemDto> lineItems = new ArrayList<>();

		switch (sub.eventType) {
			case INBOUND -> {
				lineItems.add(new FinanceLineItemDto(sub.originNode.id, sub.originNode.name, sub.modifierValue.negate()));
				lineItems.add(new FinanceLineItemDto(sub.destinationNode.id, sub.destinationNode.name, sub.modifierValue));
			}
			case OUTBOUND -> {
				lineItems.add(new FinanceLineItemDto(sub.originNode.id, sub.originNode.name, sub.modifierValue.negate()));
				lineItems.add(new FinanceLineItemDto(sub.destinationNode.id, sub.destinationNode.name, sub.modifierValue));
			}
			case OTHER -> {
				if (sub.destinationNode != null) {
					lineItems.add(new FinanceLineItemDto(sub.originNode.id, sub.originNode.name, sub.modifierValue.negate()));
					lineItems.add(new FinanceLineItemDto(sub.destinationNode.id, sub.destinationNode.name, sub.modifierValue));
				} else {
					LOG.warnf("Subscription %d is type OTHER but missing destinationNode. Skipping.", sub.id);
					return;
				}
			}
		}

		FinanceTransactionEntity transaction = new FinanceTransactionEntity();
		transaction.transactionDate = LocalDateTime.now();
		transaction.lineItems = new ArrayList<>();

		for (FinanceLineItemDto dto : lineItems) {
			FinanceLineItemEntity item = new FinanceLineItemEntity();
			FinanceNodeEntity node = new FinanceNodeEntity();
			node.id = dto.financeNodeId();
			item.financeNode = node;
			item.amount = dto.amount();
			item.transaction = transaction;
			transaction.lineItems.add(item);
		}

		FinanceEventEntity previousEvent = eventRepository.find("subscription.id = ?1 order by id DESC", sub.id).firstResult();

		FinanceEventEntity event = new FinanceEventEntity();
		event.name = "[Sub] " + sub.name;
		event.subscription = sub;
		event.description = sub.description != null ? sub.description : "Auto-generated from subscription";
		event.type = sub.eventType;
		event.transaction = transaction;

		if (sub.category != null) {
			CategoryEntity category = new CategoryEntity();
			category.id = sub.category.id;
			event.category = category;
		}

		event.tags = new ArrayList<>();
		if (sub.tags != null) {
			for (TagEntity tag : sub.tags) {
				TagEntity stub = new TagEntity();
				stub.id = tag.id;
				event.tags.add(stub);
			}
		}

		FinanceEventDto createdEvent = eventService.create(event);

		if (previousEvent != null) {
			try {
				eventService.addRelations(createdEvent.id(), List.of(previousEvent.id));
			} catch (BusinessException e) {
				LOG.warnf(e, "Failed to link subscription event %d to previous event %d", createdEvent.id(), previousEvent.id);
			}
		}
	}
}
