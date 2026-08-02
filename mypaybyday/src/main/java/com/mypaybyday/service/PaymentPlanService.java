package com.mypaybyday.service;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Consumer;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.CreatePaymentPlanDto;
import com.mypaybyday.dto.CreatePaymentPlanItemDto;
import com.mypaybyday.dto.FinanceEventDraftInputDto;
import com.mypaybyday.dto.FinanceLineItemDto;
import com.mypaybyday.dto.PaymentPlanDto;
import com.mypaybyday.dto.PaymentPlanExportDto;
import com.mypaybyday.dto.PaymentPlanItemDto;
import com.mypaybyday.dto.PaymentPlanItemExportDto;
import com.mypaybyday.dto.SectionImportResult;

import com.mypaybyday.entity.DraftEntity;
import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.entity.PaymentPlanEntity;
import com.mypaybyday.entity.PaymentPlanItemEntity;
import com.mypaybyday.entity.TagEntity;
import com.mypaybyday.entity.TemplateEntity;
import com.mypaybyday.enums.DataSection;
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
import com.mypaybyday.repository.PaymentPlanItemRepository;
import com.mypaybyday.repository.PaymentPlanRepository;
import com.mypaybyday.repository.TagRepository;
import com.mypaybyday.repository.TemplateRepository;
import com.mypaybyday.service.transfer.ArchivedItemImporter;
import com.mypaybyday.service.transfer.DataSectionTransfer;
import com.mypaybyday.service.transfer.ImportContext;
import com.mypaybyday.validation.PaymentPlanItemValidator;
import com.mypaybyday.validation.PaymentPlanValidator;
import io.quarkus.logging.Log;

@ApplicationScoped
public class PaymentPlanService implements DataSectionTransfer<PaymentPlanExportDto> {

	private final PaymentPlanRepository paymentPlanRepository;
	private final PaymentPlanItemRepository paymentPlanItemRepository;
	private final TemplateRepository templateRepository;
	private final CategoryRepository categoryRepository;
	private final TagRepository tagRepository;
	private final EventRepository eventRepository;
	private final EntityDraftRepository entityDraftRepository;
	private final PaymentPlanValidator paymentPlanValidator;
	private final PaymentPlanItemValidator paymentPlanItemValidator;
	private final DraftService draftService;
	private final Messages messages;
	private final ArchivedItemImporter archivedItemImporter;

	public PaymentPlanService(
			PaymentPlanRepository paymentPlanRepository,
			PaymentPlanItemRepository paymentPlanItemRepository,
			TemplateRepository templateRepository,
			CategoryRepository categoryRepository,
			TagRepository tagRepository,
			EventRepository eventRepository,
			EntityDraftRepository entityDraftRepository,
			PaymentPlanValidator paymentPlanValidator,
			PaymentPlanItemValidator paymentPlanItemValidator,
			DraftService draftService,
			Messages messages,
			ArchivedItemImporter archivedItemImporter) {
		this.paymentPlanRepository = paymentPlanRepository;
		this.paymentPlanItemRepository = paymentPlanItemRepository;
		this.templateRepository = templateRepository;
		this.categoryRepository = categoryRepository;
		this.tagRepository = tagRepository;
		this.eventRepository = eventRepository;
		this.entityDraftRepository = entityDraftRepository;
		this.paymentPlanValidator = paymentPlanValidator;
		this.paymentPlanItemValidator = paymentPlanItemValidator;
		this.draftService = draftService;
		this.messages = messages;
		this.archivedItemImporter = archivedItemImporter;
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
		entity.planType = dto.planType() != null ? dto.planType() : PaymentPlanType.RECURRING;
		entity.status = PaymentPlanStatus.ACTIVE;
		entity.isAutomated = Boolean.TRUE.equals(dto.isAutomated());
		entity.autoCreateDraft = dto.autoCreateDraft() == null || Boolean.TRUE.equals(dto.autoCreateDraft());
		applyEditableValues(entity, dto);
		entity.nextDueDate = entity.startDate;

		applyPlanTypeRules(entity);
		paymentPlanValidator.validate(entity);

		boolean shouldGenerateItems = dto.generateItems() == null || Boolean.TRUE.equals(dto.generateItems());
		if (shouldGenerateItems && entity.totalInstallments != null) {
			preGenerateItems(entity);
		}
		if (entity.planType == PaymentPlanType.GROUP) {
			linkGroupMembers(entity, dto.eventIds(), dto.draftIds());
		}

		paymentPlanRepository.persist(entity);

		Log.infof("Created payment plan id=%d name=%s type=%s", entity.id, entity.name, entity.planType);
		return PaymentPlanDto.from(entity);
	}

	@Transactional
	public PaymentPlanDto update(Long id, CreatePaymentPlanDto dto) throws BusinessException {
		PaymentPlanEntity entity = findEntityById(id);
		entity.planType = dto.planType() != null ? dto.planType() : entity.planType;
		entity.isAutomated = dto.isAutomated() != null ? dto.isAutomated() : entity.isAutomated;
		entity.autoCreateDraft = dto.autoCreateDraft() != null ? dto.autoCreateDraft() : entity.autoCreateDraft;
		if (dto.status() != null) {
			entity.status = dto.status();
		}
		applyEditableValues(entity, dto);

		applyPlanTypeRules(entity);

		paymentPlanValidator.validate(entity);
		paymentPlanRepository.persist(entity);
		Log.infof("Updated payment plan id=%d name=%s", entity.id, entity.name);
		return PaymentPlanDto.from(entity);
	}

	private void applyEditableValues(PaymentPlanEntity entity, CreatePaymentPlanDto dto) throws BusinessException {
		entity.name = dto.name();
		entity.description = dto.description();
		entity.totalInstallments = dto.totalInstallments();
		entity.totalAmount = dto.totalAmount();
		entity.installmentAmount = dto.installmentAmount();
		entity.frequency = dto.frequency();
		entity.startDate = dto.startDate() != null ? dto.startDate() : LocalDate.now();
		entity.endDate = dto.endDate();
		entity.template = dto.templateId() != null ? findTemplateById(dto.templateId()) : null;
		entity.category = dto.categoryId() != null ? categoryRepository.findById(dto.categoryId()) : null;
		entity.tags = resolveTags(dto.tagIds());
	}

	private TemplateEntity findTemplateById(Long templateId) throws BusinessException {
		TemplateEntity template = templateRepository.findById(templateId);
		if (template == null) {
			throw messages.reject(MsgKey.PAYMENT_PLAN_TEMPLATE_NOT_FOUND, templateId);
		}
		return template;
	}

	private Set<TagEntity> resolveTags(List<Long> tagIds) {
		if (tagIds == null || tagIds.isEmpty()) {
			return new HashSet<>();
		}
		return new HashSet<>(tagRepository.list("id in ?1", tagIds));
	}

	/**
	 * Each kind of plan owns a different subset of the fields, so whatever does not belong to the
	 * chosen kind is dropped here rather than being validated field by field: a group and a custom
	 * plan have no cadence and no automation, and a subscription has no finite cuota count.
	 */
	private void applyPlanTypeRules(PaymentPlanEntity entity) {
		if (!entity.planType.supportsAutomation()) {
			entity.isAutomated = false;
			entity.autoCreateDraft = false;
			entity.template = null;
			entity.nextDueDate = null;
		}
		if (!entity.planType.requiresFrequency()) {
			entity.frequency = entity.planType == PaymentPlanType.GROUP ? RecurrenceFrequency.INSTANT : null;
		}
		if (!entity.planType.requiresTotalInstallments()) {
			entity.totalInstallments = null;
			entity.totalAmount = null;
		}
		if (!entity.planType.carriesCycleAmount()) {
			entity.installmentAmount = null;
		}
		if (entity.planType == PaymentPlanType.GROUP) {
			entity.endDate = null;
		}
	}

	private void preGenerateItems(PaymentPlanEntity plan) {
		LocalDate currentDueDate = plan.startDate;
		for (int i = 1; i <= plan.totalInstallments; i++) {
			plan.items.add(newItem(plan, i, currentDueDate, PaymentPlanItemStatus.PENDING));
			currentDueDate = plan.frequency.advance(currentDueDate, 1);
		}
	}

	private PaymentPlanItemEntity newItem(PaymentPlanEntity plan, int installmentNumber, LocalDate expectedDate, PaymentPlanItemStatus status) {
		PaymentPlanItemEntity item = new PaymentPlanItemEntity();
		item.paymentPlan = plan;
		item.installmentNumber = installmentNumber;
		item.expectedDate = expectedDate;
		item.itemStatus = status;
		return item;
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
			LocalDate eventDate = event.transaction != null ? event.transaction.transactionDate.toLocalDate() : plan.startDate;
			PaymentPlanItemEntity item = newItem(plan, installmentNumber++, eventDate, PaymentPlanItemStatus.PAID);
			item.event = event;
			plan.items.add(item);
		}
		for (Long draftId : draftIds != null ? draftIds : List.<Long>of()) {
			DraftEntity draft = entityDraftRepository.findById(draftId);
			if (draft == null) continue;
			PaymentPlanItemEntity item = newItem(plan, installmentNumber++, plan.startDate, PaymentPlanItemStatus.DRAFTED);
			item.draft = draft;
			plan.items.add(item);
		}
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
		paymentPlanItemValidator.validateHasRoomForAnotherItem(plan);

		PaymentPlanItemEntity item = new PaymentPlanItemEntity();
		item.paymentPlan = plan;
		item.installmentNumber = dto.installmentNumber() != null ? dto.installmentNumber() : nextInstallmentNumber(plan);
		item.expectedDate = dto.expectedDate();
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

		if (dto.installmentNumber() != null) {
			item.installmentNumber = dto.installmentNumber();
		}
		if (dto.expectedDate() != null) {
			item.expectedDate = dto.expectedDate();
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
	 * A group/custom entry without a link is meaningless, so it is deleted outright; a cuota or a
	 * subscription cycle keeps its slot in the schedule and simply goes back to pending.
	 */
	private void detachItems(List<PaymentPlanItemEntity> items, Consumer<PaymentPlanItemEntity> clearLink) {
		for (PaymentPlanItemEntity item : items) {
			if (item.paymentPlan.planType.hasLinkOnlyItems()) {
				item.paymentPlan.items.remove(item);
				paymentPlanItemRepository.delete(item);
			} else {
				clearLink.accept(item);
				item.itemStatus = PaymentPlanItemStatus.PENDING;
			}
		}
	}

	private void applyLinkValues(PaymentPlanItemEntity item, CreatePaymentPlanItemDto dto) {
		item.itemStatus = dto.itemStatus() != null ? dto.itemStatus() : PaymentPlanItemStatus.PENDING;
		item.event = dto.eventId() != null ? eventRepository.findById(dto.eventId()) : null;
		item.draft = dto.draftId() != null ? entityDraftRepository.findById(dto.draftId()) : null;
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
		LocalDate today = LocalDate.now();
		openElapsedSubscriptionCycles(today);

		for (PaymentPlanItemEntity item : paymentPlanItemRepository.findDueItems(today)) {
			if (!isGeneratingPlan(item.paymentPlan)) {
				continue;
			}
			try {
				DraftEntity draft = draftService.createStandaloneFinanceEventDraft(buildCycleDraft(item));
				item.draft = draft;
				item.itemStatus = PaymentPlanItemStatus.DRAFTED;
				paymentPlanItemRepository.persist(item);

				Log.infof("Job created draft id=%d for payment plan item id=%d (cuota %d)", draft.id, item.id, item.installmentNumber);
			} catch (Exception e) {
				Log.errorf(e, "Failed to process due payment plan item id=%d", item.id);
			}
		}
	}

	/**
	 * An installment plan knows all its cuotas up front, but a subscription is open-ended: its
	 * cycles only exist once they have elapsed. Without this the scheduler would find nothing to
	 * turn into a draft and an automated subscription would never fire.
	 */
	private void openElapsedSubscriptionCycles(LocalDate today) {
		for (PaymentPlanEntity plan : paymentPlanRepository.findActiveAutomatedPlans()) {
			if (plan.planType != PaymentPlanType.RECURRING || plan.frequency == null || !plan.frequency.isSchedulable()) {
				continue;
			}

			LocalDate scheduleEndDate = plan.scheduleEndDate();
			LocalDate cycleDate = plan.nextDueDate != null ? plan.nextDueDate : plan.startDate;
			int installmentNumber = nextInstallmentNumber(plan);

			while (!cycleDate.isAfter(today) && (scheduleEndDate == null || !cycleDate.isAfter(scheduleEndDate))) {
				PaymentPlanItemEntity cycle = newItem(plan, installmentNumber++, cycleDate, PaymentPlanItemStatus.PENDING);
				plan.items.add(cycle);
				paymentPlanItemRepository.persist(cycle);
				cycleDate = plan.frequency.advance(cycleDate, 1);
			}

			plan.nextDueDate = cycleDate;
		}
	}

	private boolean isGeneratingPlan(PaymentPlanEntity plan) {
		return plan != null
			&& plan.isAutomated
			&& plan.status == PaymentPlanStatus.ACTIVE
			&& plan.planType.supportsAutomation();
	}

	/**
	 * The origin and destination of a generated event come from the plan's template, which is the
	 * object that models "who pays whom"; the plan contributes the amount, the schedule and the
	 * classification the user chose for it.
	 */
	private FinanceEventDraftInputDto buildCycleDraft(PaymentPlanItemEntity item) {
		PaymentPlanEntity plan = item.paymentPlan;
		TemplateEntity template = plan.template;

		List<FinanceLineItemDto> lineItems = List.of(
			new FinanceLineItemDto(template.originNode.id, null, null, plan.installmentAmount.negate()),
			new FinanceLineItemDto(template.destinationNode.id, null, null, plan.installmentAmount)
		);

		String totalLabel = plan.totalInstallments != null ? String.valueOf(plan.totalInstallments) : "∞";
		String draftName = plan.name + " (" + item.installmentNumber + "/" + totalLabel + ")";

		return new FinanceEventDraftInputDto(
			null,
			draftName,
			plan.description,
			template.eventType != null ? template.eventType : EventType.OUTBOUND,
			item.expectedDate.atStartOfDay(),
			plan.category != null ? plan.category.id : null,
			plan.tags != null ? plan.tags.stream().map(tag -> tag.id).toList() : List.of(),
			lineItems
		);
	}

	private PaymentPlanEntity findEntityById(Long id) throws BusinessException {
		PaymentPlanEntity entity = paymentPlanRepository.findById(id);
		if (entity == null) {
			throw messages.reject(MsgKey.PAYMENT_PLAN_NOT_FOUND, id);
		}
		return entity;
	}

	// -------------------------------------------------------------------------
	// Data transfer
	// -------------------------------------------------------------------------

	@Override
	public DataSection section() {
		return DataSection.PAYMENT_PLANS;
	}

	@Override
	@Transactional
	public long countForExport() {
		return paymentPlanRepository.count();
	}

	@Override
	@Transactional
	public List<PaymentPlanExportDto> exportData() {
		return paymentPlanRepository.listAll().stream().map(PaymentPlanExportDto::from).toList();
	}

	@Override
	@Transactional
	public SectionImportResult importData(List<PaymentPlanExportDto> items, ImportContext context) {
		return archivedItemImporter.importEach(section(), items, PaymentPlanExportDto::name, dto -> {
			PaymentPlanEntity plan = new PaymentPlanEntity();
			plan.name = dto.name();
			plan.description = dto.description();
			plan.planType = dto.planType();
			plan.status = dto.status();
			plan.totalInstallments = dto.totalInstallments();
			plan.totalAmount = dto.totalAmount();
			plan.installmentAmount = dto.installmentAmount();
			plan.frequency = dto.frequency();
			plan.startDate = dto.startDate();
			plan.endDate = dto.endDate();
			plan.nextDueDate = dto.nextDueDate();
			plan.isAutomated = dto.isAutomated();
			plan.autoCreateDraft = dto.autoCreateDraft();

			if (dto.templateId() != null) {
				Long newTmpId = context.remap(DataSection.TEMPLATES, dto.templateId());
				if (newTmpId != null) {
					plan.template = templateRepository.findById(newTmpId);
				}
			}
			if (dto.categoryId() != null) {
				Long newCatId = context.remap(DataSection.CATEGORIES, dto.categoryId());
				if (newCatId != null) {
					plan.category = categoryRepository.findById(newCatId);
				}
			}
			if (dto.tagIds() != null && !dto.tagIds().isEmpty()) {
				Set<TagEntity> tags = new HashSet<>();
				for (Long oldTagId : dto.tagIds()) {
					Long newTagId = context.remap(DataSection.TAGS, oldTagId);
					if (newTagId != null) {
						TagEntity tag = tagRepository.findById(newTagId);
						if (tag != null) {
							tags.add(tag);
						}
					}
				}
				plan.tags = tags;
			}

			if (dto.items() != null && !dto.items().isEmpty()) {
				for (PaymentPlanItemExportDto itemDto : dto.items()) {
					PaymentPlanItemEntity item = new PaymentPlanItemEntity();
					item.paymentPlan = plan;
					item.installmentNumber = itemDto.installmentNumber();
					item.expectedDate = itemDto.expectedDate();
					item.itemStatus = itemDto.itemStatus();

					if (itemDto.eventId() != null) {
						Long newEvId = context.remap(DataSection.EVENTS, itemDto.eventId());
						if (newEvId != null) {
							item.event = eventRepository.findById(newEvId);
						}
					}
					if (itemDto.draftId() != null) {
						Long newDraftId = context.remap(DataSection.DRAFTS, itemDto.draftId());
						if (newDraftId != null) {
							item.draft = entityDraftRepository.findById(newDraftId);
						}
					}
					plan.items.add(item);
				}
			}

			paymentPlanValidator.validate(plan);
			paymentPlanRepository.persist(plan);
			context.rememberId(section(), dto.id(), plan.id);
		});
	}
}
