package com.mypaybyday.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Consumer;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mypaybyday.dto.CategoryDto;
import com.mypaybyday.dto.CreatePaymentPlanDto;
import com.mypaybyday.dto.CreatePaymentPlanItemDto;
import com.mypaybyday.dto.FinanceEventDraftInputDto;
import com.mypaybyday.dto.FinanceLineItemDto;
import com.mypaybyday.dto.PaymentPlanDto;
import com.mypaybyday.dto.PaymentPlanItemDto;

import com.mypaybyday.entity.CategoryEntity;
import com.mypaybyday.entity.DraftEntity;
import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.entity.FinanceNodeEntity;
import com.mypaybyday.entity.PaymentPlanEntity;
import com.mypaybyday.entity.PaymentPlanItemEntity;
import com.mypaybyday.entity.TagEntity;
import com.mypaybyday.enums.EntityType;
import com.mypaybyday.enums.EventType;
import com.mypaybyday.enums.PaymentPlanItemStatus;
import com.mypaybyday.enums.PaymentPlanStatus;
import com.mypaybyday.enums.PaymentPlanType;
import com.mypaybyday.enums.RecurrenceFrequency;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.CategoryRepository;
import com.mypaybyday.repository.EntityDraftRepository;
import com.mypaybyday.repository.EventRepository;
import com.mypaybyday.repository.FinanceNodeRepository;
import com.mypaybyday.repository.PaymentPlanItemRepository;
import com.mypaybyday.repository.PaymentPlanRepository;
import com.mypaybyday.repository.TagRepository;
import com.mypaybyday.validation.PaymentPlanItemValidator;
import com.mypaybyday.validation.PaymentPlanValidator;
import io.quarkus.logging.Log;

@ApplicationScoped
public class PaymentPlanService {

	private final PaymentPlanRepository paymentPlanRepository;
	private final PaymentPlanItemRepository paymentPlanItemRepository;
	private final FinanceNodeRepository financeNodeRepository;
	private final CategoryRepository categoryRepository;
	private final TagRepository tagRepository;
	private final EventRepository eventRepository;
	private final EntityDraftRepository entityDraftRepository;
	private final PaymentPlanValidator paymentPlanValidator;
	private final PaymentPlanItemValidator paymentPlanItemValidator;
	private final DraftService draftService;
	private final Messages messages;

	public PaymentPlanService(
			PaymentPlanRepository paymentPlanRepository,
			PaymentPlanItemRepository paymentPlanItemRepository,
			FinanceNodeRepository financeNodeRepository,
			CategoryRepository categoryRepository,
			TagRepository tagRepository,
			EventRepository eventRepository,
			EntityDraftRepository entityDraftRepository,
			PaymentPlanValidator paymentPlanValidator,
			PaymentPlanItemValidator paymentPlanItemValidator,
			DraftService draftService,
			Messages messages) {
		this.paymentPlanRepository = paymentPlanRepository;
		this.paymentPlanItemRepository = paymentPlanItemRepository;
		this.financeNodeRepository = financeNodeRepository;
		this.categoryRepository = categoryRepository;
		this.tagRepository = tagRepository;
		this.eventRepository = eventRepository;
		this.entityDraftRepository = entityDraftRepository;
		this.paymentPlanValidator = paymentPlanValidator;
		this.paymentPlanItemValidator = paymentPlanItemValidator;
		this.draftService = draftService;
		this.messages = messages;
	}

	@Transactional
	public List<PaymentPlanDto> listAll() {
		return paymentPlanRepository.listAll().stream().map(PaymentPlanDto::from).toList();
	}

	@Transactional
	public PaymentPlanDto findById(Long id) throws BusinessException {
		PaymentPlanEntity entity = findEntityById(id);
		return PaymentPlanDto.from(entity);
	}

	@Transactional
	public PaymentPlanDto create(CreatePaymentPlanDto dto) throws BusinessException {
		PaymentPlanEntity entity = new PaymentPlanEntity();
		entity.name = dto.name();
		entity.description = dto.description();
		entity.planType = dto.planType() != null ? dto.planType() : PaymentPlanType.RECURRING;
		entity.status = PaymentPlanStatus.ACTIVE;
		entity.totalInstallments = dto.totalInstallments();
		entity.totalAmount = dto.totalAmount();
		entity.installmentAmount = dto.installmentAmount();
		entity.frequency = dto.frequency() != null ? dto.frequency() : RecurrenceFrequency.MONTHLY;
		entity.startDate = dto.startDate() != null ? dto.startDate() : LocalDate.now();
		entity.nextDueDate = entity.startDate;
		entity.isAutomated = Boolean.TRUE.equals(dto.isAutomated());
		entity.autoCreateDraft = dto.autoCreateDraft() == null || Boolean.TRUE.equals(dto.autoCreateDraft());

		if (dto.originNodeId() != null) {
			entity.originNode = financeNodeRepository.findById(dto.originNodeId());
		}
		if (dto.destinationNodeId() != null) {
			entity.destinationNode = financeNodeRepository.findById(dto.destinationNodeId());
		}
		if (dto.categoryId() != null) {
			entity.category = categoryRepository.findById(dto.categoryId());
		}

		if (dto.tagIds() != null && !dto.tagIds().isEmpty()) {
			Set<TagEntity> tags = new HashSet<>();
			for (Long tagId : dto.tagIds()) {
				TagEntity tag = tagRepository.findById(tagId);
				if (tag != null) tags.add(tag);
			}
			entity.tags = tags;
		}

		applyGroupPlanRules(entity);

		boolean shouldGenerateItems = dto.generateItems() == null || Boolean.TRUE.equals(dto.generateItems());
		if (shouldGenerateItems && entity.totalInstallments != null && entity.totalInstallments > 0) {
			preGenerateItems(entity);
		}
		if (entity.planType == PaymentPlanType.GROUP) {
			linkGroupMembers(entity, dto.eventIds(), dto.draftIds());
		}

		paymentPlanValidator.validate(entity);
		paymentPlanRepository.persist(entity);

		Log.infof("Created payment plan id=%d name=%s type=%s", entity.id, entity.name, entity.planType);
		return PaymentPlanDto.from(entity);
	}

	private void applyGroupPlanRules(PaymentPlanEntity entity) {
		if (entity.planType != PaymentPlanType.GROUP) {
			return;
		}
		entity.frequency = RecurrenceFrequency.INSTANT;
		entity.nextDueDate = null;
		entity.totalInstallments = null;
		entity.isAutomated = false;
		entity.autoCreateDraft = false;
	}

	private void preGenerateItems(PaymentPlanEntity plan) {
		LocalDate currentDueDate = plan.startDate;
		for (int i = 1; i <= plan.totalInstallments; i++) {
			PaymentPlanItemEntity item = new PaymentPlanItemEntity();
			item.paymentPlan = plan;
			item.installmentNumber = i;
			item.expectedDate = currentDueDate;
			item.expectedAmount = plan.installmentAmount;
			item.itemStatus = PaymentPlanItemStatus.PENDING;
			plan.items.add(item);

			currentDueDate = calculateNextDate(currentDueDate, plan.frequency);
		}
	}

	/**
	 * Links pre-existing events/drafts as group members in one shot, so the Group creation UI
	 * never forces the user through the per-item add flow. Linked events are already-settled
	 * money movements (PAID); linked drafts are still pending confirmation (DRAFTED). Drafts have
	 * no structured date of their own (raw JSON payload), so members fall back to the group's date.
	 */
	private void linkGroupMembers(PaymentPlanEntity plan, List<Long> eventIds, List<Long> draftIds) {
		int installmentNumber = 1;
		for (Long eventId : eventIds != null ? eventIds : List.<Long>of()) {
			FinanceEventEntity event = eventRepository.findById(eventId);
			if (event == null) continue;
			PaymentPlanItemEntity item = new PaymentPlanItemEntity();
			item.paymentPlan = plan;
			item.installmentNumber = installmentNumber++;
			item.expectedDate = event.transaction != null ? event.transaction.transactionDate.toLocalDate() : plan.startDate;
			item.itemStatus = PaymentPlanItemStatus.PAID;
			item.event = event;
			plan.items.add(item);
		}
		for (Long draftId : draftIds != null ? draftIds : List.<Long>of()) {
			DraftEntity draft = entityDraftRepository.findById(draftId);
			if (draft == null) continue;
			PaymentPlanItemEntity item = new PaymentPlanItemEntity();
			item.paymentPlan = plan;
			item.installmentNumber = installmentNumber++;
			item.expectedDate = plan.startDate;
			item.itemStatus = PaymentPlanItemStatus.DRAFTED;
			item.draft = draft;
			plan.items.add(item);
		}
	}

	private LocalDate calculateNextDate(LocalDate date, RecurrenceFrequency frequency) {
		if (frequency == null) return date.plusMonths(1);
		return switch (frequency) {
			case DAILY -> date.plusDays(1);
			case WEEKLY -> date.plusWeeks(1);
			case MONTHLY -> date.plusMonths(1);
			case YEARLY -> date.plusYears(1);
			case INSTANT -> date;
		};
	}

	@Transactional
	public PaymentPlanDto cancel(Long id) throws BusinessException {
		PaymentPlanEntity entity = findEntityById(id);
		entity.status = PaymentPlanStatus.CANCELLED;
		paymentPlanRepository.persist(entity);
		Log.infof("Cancelled payment plan id=%d", id);
		return PaymentPlanDto.from(entity);
	}

	/**
	 * GROUP plans are never automated, so there is no in-flight schedule a delete could
	 * silently orphan — they can be removed directly. The other kinds still require CANCELLED
	 * first as a deliberate two-step confirmation before losing an automated plan's history.
	 */
	@Transactional
	public void delete(Long id) throws BusinessException {
		PaymentPlanEntity entity = findEntityById(id);
		if (entity.planType != PaymentPlanType.GROUP && entity.status != PaymentPlanStatus.CANCELLED) {
			throw messages.reject(MsgKey.PAYMENT_PLAN_NOT_CANCELLED_FOR_DELETE);
		}
		paymentPlanRepository.delete(entity);
		Log.infof("Deleted payment plan id=%d", id);
	}

	@Transactional
	public PaymentPlanDto update(Long id, CreatePaymentPlanDto dto) throws BusinessException {
		PaymentPlanEntity entity = findEntityById(id);
		entity.name = dto.name();
		entity.description = dto.description();
		entity.planType = dto.planType();
		entity.frequency = dto.frequency() != null ? dto.frequency() : entity.frequency;
		entity.startDate = dto.startDate();
		entity.isAutomated = dto.isAutomated() != null ? dto.isAutomated() : true;
		entity.autoCreateDraft = dto.autoCreateDraft() != null ? dto.autoCreateDraft() : true;
		if (dto.status() != null) {
			entity.status = dto.status();
		}
		entity.installmentAmount = dto.installmentAmount();
		entity.totalAmount = dto.totalAmount();
		entity.totalInstallments = dto.totalInstallments();

		if (dto.originNodeId() != null) {
			entity.originNode = financeNodeRepository.findById(dto.originNodeId());
		} else {
			entity.originNode = null;
		}

		if (dto.destinationNodeId() != null) {
			entity.destinationNode = financeNodeRepository.findById(dto.destinationNodeId());
		} else {
			entity.destinationNode = null;
		}

		if (dto.categoryId() != null) {
			entity.category = categoryRepository.findById(dto.categoryId());
		} else {
			entity.category = null;
		}

		if (dto.tagIds() != null && !dto.tagIds().isEmpty()) {
			entity.tags = new java.util.HashSet<>(tagRepository.list("id in ?1", dto.tagIds()));
		} else {
			entity.tags.clear();
		}

		applyGroupPlanRules(entity);

		paymentPlanValidator.validate(entity);
		paymentPlanRepository.persist(entity);
		Log.infof("Updated payment plan id=%d name=%s", entity.id, entity.name);
		return PaymentPlanDto.from(entity);
	}

	@Transactional
	public List<PaymentPlanItemDto> listItems(Long planId) throws BusinessException {
		PaymentPlanEntity plan = findEntityById(planId);
		return plan.items.stream()
			.sorted((left, right) -> Integer.compare(left.installmentNumber, right.installmentNumber))
			.map(PaymentPlanItemDto::from)
			.toList();
	}

	@Transactional
	public PaymentPlanItemDto findItemById(Long planId, Long itemId) throws BusinessException {
		return PaymentPlanItemDto.from(findItemEntityById(planId, itemId));
	}

	@Transactional
	public PaymentPlanItemDto createItem(Long planId, CreatePaymentPlanItemDto dto) throws BusinessException {
		PaymentPlanEntity plan = findEntityById(planId);
		requireUserComposedPlan(plan);

		PaymentPlanItemEntity item = new PaymentPlanItemEntity();
		item.paymentPlan = plan;
		item.installmentNumber = dto.installmentNumber() != null ? dto.installmentNumber() : nextInstallmentNumber(plan);
		applyScheduleValues(item, dto, plan.installmentAmount);
		applyLinkValues(item, dto);

		paymentPlanItemValidator.validate(item);
		plan.items.add(item);
		paymentPlanItemRepository.persist(item);

		Log.infof("Created payment plan item id=%d (cuota %d) for plan id=%d", item.id, item.installmentNumber, planId);
		return PaymentPlanItemDto.from(item);
	}

	@Transactional
	public PaymentPlanItemDto updateItem(Long planId, Long itemId, CreatePaymentPlanItemDto dto) throws BusinessException {
		PaymentPlanItemEntity item = findItemEntityById(planId, itemId);

		if (isUserComposedPlan(item.paymentPlan)) {
			if (dto.installmentNumber() != null) {
				item.installmentNumber = dto.installmentNumber();
			}
			applyScheduleValues(item, dto, item.expectedAmount);
		}
		applyLinkValues(item, dto);

		paymentPlanItemValidator.validate(item);
		paymentPlanItemRepository.persist(item);

		Log.infof("Updated payment plan item id=%d for plan id=%d", itemId, planId);
		return PaymentPlanItemDto.from(item);
	}

	@Transactional
	public void deleteItem(Long planId, Long itemId) throws BusinessException {
		PaymentPlanItemEntity item = findItemEntityById(planId, itemId);
		requireUserComposedPlan(item.paymentPlan);
		item.paymentPlan.items.remove(item);
		paymentPlanItemRepository.delete(item);
		Log.infof("Deleted payment plan item id=%d for plan id=%d", itemId, planId);
	}

	/**
	 * The counterpart of confirming a draft into an event: any item still pointing at the draft
	 * follows it to the event that replaced it instead of losing the link when the draft is deleted.
	 */
	@Transactional
	public void relinkDraftToEvent(Long draftId, Long eventId) {
		FinanceEventEntity event = eventRepository.findById(eventId);
		for (PaymentPlanItemEntity item : paymentPlanItemRepository.list("draft.id", draftId)) {
			item.draft = null;
			item.event = event;
			item.itemStatus = PaymentPlanItemStatus.PAID;
		}
	}

	/** Called before a draft is deleted outright (not confirmed), so no item is left pointing at it. */
	@Transactional
	public void unlinkDraft(Long draftId) {
		detachItems(paymentPlanItemRepository.list("draft.id", draftId), item -> item.draft = null);
	}

	/** Called before an event is deleted outright, so no item is left pointing at it. */
	@Transactional
	public void unlinkEvent(Long eventId) {
		detachItems(paymentPlanItemRepository.list("event.id", eventId), item -> item.event = null);
	}

	/** Called before the source events of a merge are deleted, so their items follow to the survivor. */
	@Transactional
	public void relinkMergedEvents(Long baseEventId, List<Long> sourceEventIds) {
		FinanceEventEntity baseEvent = eventRepository.findById(baseEventId);
		for (PaymentPlanItemEntity item : paymentPlanItemRepository.list("event.id IN ?1", sourceEventIds)) {
			item.event = baseEvent;
		}
	}

	/**
	 * A group/custom entry without a link is meaningless, so it is deleted outright; a
	 * system-generated cuota keeps its slot in the schedule and simply goes back to pending.
	 */
	private void detachItems(List<PaymentPlanItemEntity> items, Consumer<PaymentPlanItemEntity> clearLink) {
		for (PaymentPlanItemEntity item : items) {
			if (isUserComposedPlan(item.paymentPlan)) {
				item.paymentPlan.items.remove(item);
				paymentPlanItemRepository.delete(item);
			} else {
				clearLink.accept(item);
				item.itemStatus = PaymentPlanItemStatus.PENDING;
			}
		}
	}

	private void applyScheduleValues(PaymentPlanItemEntity item, CreatePaymentPlanItemDto dto, BigDecimal fallbackAmount) {
		item.expectedDate = dto.expectedDate();
		item.expectedAmount = dto.expectedAmount() != null ? dto.expectedAmount() : fallbackAmount;
	}

	private void applyLinkValues(PaymentPlanItemEntity item, CreatePaymentPlanItemDto dto) {
		item.itemStatus = dto.itemStatus() != null ? dto.itemStatus() : PaymentPlanItemStatus.PENDING;
		item.event = dto.eventId() != null ? eventRepository.findById(dto.eventId()) : null;
		item.draft = dto.draftId() != null ? entityDraftRepository.findById(dto.draftId()) : null;
	}

	private boolean isUserComposedPlan(PaymentPlanEntity plan) {
		return plan.planType == PaymentPlanType.CUSTOM || plan.planType == PaymentPlanType.GROUP;
	}

	private void requireUserComposedPlan(PaymentPlanEntity plan) throws BusinessException {
		if (!isUserComposedPlan(plan)) {
			throw messages.reject(MsgKey.PAYMENT_PLAN_ITEMS_NOT_COMPOSABLE);
		}
	}

	private int nextInstallmentNumber(PaymentPlanEntity plan) {
		return plan.items.stream().mapToInt(item -> item.installmentNumber).max().orElse(0) + 1;
	}

	private PaymentPlanItemEntity findItemEntityById(Long planId, Long itemId) throws BusinessException {
		PaymentPlanEntity plan = findEntityById(planId);
		return plan.items.stream()
			.filter(item -> item.id.equals(itemId))
			.findFirst()
			.orElseThrow(() -> messages.reject(MsgKey.PAYMENT_PLAN_ITEM_NOT_FOUND, itemId));
	}

	@Transactional
	public void processDueItems() {
		List<PaymentPlanItemEntity> dueItems = paymentPlanItemRepository.findDueItems(LocalDate.now());
		for (PaymentPlanItemEntity item : dueItems) {
			if (item.paymentPlan == null || !item.paymentPlan.isAutomated() || item.paymentPlan.status != PaymentPlanStatus.ACTIVE) {
				continue;
			}
			if (item.paymentPlan.planType == PaymentPlanType.GROUP) {
				continue;
			}
			try {
				// Job's sole responsibility: Create a DraftEntity for the due item
				List<FinanceLineItemDto> lineItems = List.of();
				if (item.paymentPlan.originNode != null && item.paymentPlan.destinationNode != null && item.expectedAmount != null) {
					lineItems = List.of(
						new FinanceLineItemDto(item.paymentPlan.originNode.id, null, null, item.expectedAmount.negate()),
						new FinanceLineItemDto(item.paymentPlan.destinationNode.id, null, null, item.expectedAmount)
					);
				}

				String draftName = item.paymentPlan.name + " (" + item.installmentNumber + "/" + (item.paymentPlan.totalInstallments != null ? item.paymentPlan.totalInstallments : "∞") + ")";
				FinanceEventDraftInputDto draftInput = new FinanceEventDraftInputDto(
					null,
					draftName,
					item.paymentPlan.description,
					EventType.OUTBOUND,
					item.expectedDate.atStartOfDay(),
					item.paymentPlan.category != null ? item.paymentPlan.category.id : null,
					item.paymentPlan.tags != null ? item.paymentPlan.tags.stream().map(t -> t.id).toList() : List.of(),
					lineItems
				);

				DraftEntity draft = draftService.createStandaloneFinanceEventDraft(draftInput);
				item.draft = draft;
				item.itemStatus = PaymentPlanItemStatus.DRAFTED;
				paymentPlanItemRepository.persist(item);

				Log.infof("Job created draft id=%d for payment plan item id=%d (cuota %d)", draft.id, item.id, item.installmentNumber);
			} catch (Exception e) {
				Log.errorf(e, "Failed to process due payment plan item id=%d", item.id);
			}
		}
	}

	private PaymentPlanEntity findEntityById(Long id) throws BusinessException {
		PaymentPlanEntity entity = paymentPlanRepository.findById(id);
		if (entity == null) {
			throw messages.reject(MsgKey.PAYMENT_PLAN_NOT_FOUND, id);
		}
		return entity;
	}
}
