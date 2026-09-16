package com.mypaybyday.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.List;

import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.AttachToPaymentPlanDto;
import com.mypaybyday.dto.CreatePaymentPlanDto;
import com.mypaybyday.dto.CreatePaymentPlanItemDto;
import com.mypaybyday.dto.PaymentPlanDto;
import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.FinanceNodeDto;
import com.mypaybyday.dto.PaymentPlanItemDto;
import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.entity.FinanceLineItemEntity;
import com.mypaybyday.entity.FinanceNodeEntity;
import com.mypaybyday.entity.FinanceTransactionEntity;
import com.mypaybyday.enums.EventType;
import com.mypaybyday.enums.FinanceNodeType;
import com.mypaybyday.enums.PaymentPlanStatus;
import com.mypaybyday.enums.PaymentPlanType;
import com.mypaybyday.enums.RecurrenceFrequency;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.event.EventService;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@QuarkusTest
class PaymentPlanServiceTest {

	private static final LocalDate START = LocalDate.of(2026, 1, 10);

	@Inject
	PaymentPlanService paymentPlanService;

	@Inject
	EventService eventService;

	@Inject
	FinanceNodeService financeNodeService;

	private CreatePaymentPlanDto planDto(
			String name,
			PaymentPlanType planType,
			Integer totalInstallments,
			BigDecimal installmentAmount,
			RecurrenceFrequency frequency,
			LocalDate startDate,
			LocalDate endDate,
			Boolean isAutomated,
			Long templateId) {
		return new CreatePaymentPlanDto(
			name,
			null,
			planType,
			totalInstallments,
			null,
			installmentAmount,
			frequency,
			startDate,
			endDate,
			isAutomated,
			false,
			templateId,
			true,
			null,
			null,
			null,
			null,
			null,
			null
		);
	}

	private CreatePaymentPlanItemDto itemDto(LocalDate expectedDate) {
		return new CreatePaymentPlanItemDto(null, expectedDate, null, null, null);
	}

	@Test
	@Transactional
	void testDeletePaymentPlan_OnlyAllowedWhenCancelled() throws BusinessException {
		PaymentPlanDto created = paymentPlanService.create(planDto(
			"Gym Membership", PaymentPlanType.RECURRING, null, new BigDecimal("50.00"),
			RecurrenceFrequency.MONTHLY, START, null, false, null));

		assertNotNull(created.id());
		assertEquals(PaymentPlanStatus.ACTIVE, created.status());

		BusinessException ex = assertThrows(BusinessException.class, () -> paymentPlanService.delete(created.id()));
		assertTrue(ex.getMessage().contains("cancelled payment plans"));

		assertEquals(PaymentPlanStatus.CANCELLED, paymentPlanService.cancel(created.id()).status());
		paymentPlanService.delete(created.id());

		assertThrows(BusinessException.class, () -> paymentPlanService.findById(created.id()));
	}

	@Test
	@Transactional
	void testAutomationRequiresATemplate() {
		BusinessException ex = assertThrows(BusinessException.class, () -> paymentPlanService.create(planDto(
			"Netflix", PaymentPlanType.RECURRING, null, new BigDecimal("15.00"),
			RecurrenceFrequency.MONTHLY, START, null, true, null)));
		assertTrue(ex.getMessage().contains("template"));
	}

	@Test
	@Transactional
	void testManualPlanNeedsNeitherTemplateNorAmount() throws BusinessException {
		PaymentPlanDto plan = paymentPlanService.create(planDto(
			"Rent", PaymentPlanType.RECURRING, null, null,
			RecurrenceFrequency.MONTHLY, START, null, false, null));

		assertNull(plan.template());
		assertNull(plan.installmentAmount());
	}

	@Test
	@Transactional
	void testInstallmentPlanRequiresItsCuotaCountAndBoundsItsWindow() throws BusinessException {
		assertThrows(BusinessException.class, () -> paymentPlanService.create(planDto(
			"Fridge", PaymentPlanType.INSTALLMENT, null, null,
			RecurrenceFrequency.MONTHLY, START, null, false, null)));

		PaymentPlanDto plan = paymentPlanService.create(planDto(
			"Fridge", PaymentPlanType.INSTALLMENT, 12, null,
			RecurrenceFrequency.MONTHLY, START, null, false, null));

		assertEquals(12, plan.items().size());
		assertEquals(START.plusMonths(11), plan.scheduleEndDate());
	}

	@Test
	@Transactional
	void testCustomPlanNeedsAWindowAndHasNoCadenceOrAutomation() throws BusinessException {
		assertThrows(BusinessException.class, () -> paymentPlanService.create(planDto(
			"Wedding savings", PaymentPlanType.CUSTOM, null, null,
			null, START, null, false, null)));

		PaymentPlanDto plan = paymentPlanService.create(planDto(
			"Wedding savings", PaymentPlanType.CUSTOM, null, new BigDecimal("100.00"),
			RecurrenceFrequency.MONTHLY, START, START.plusMonths(6), true, null));

		assertNull(plan.frequency());
		assertNull(plan.installmentAmount());
		assertFalse(plan.isAutomated());
		assertEquals(START.plusMonths(6), plan.scheduleEndDate());
	}

	@Test
	@Transactional
	void testEndDateCannotPrecedeStartDate() {
		assertThrows(BusinessException.class, () -> paymentPlanService.create(planDto(
			"Backwards", PaymentPlanType.CUSTOM, null, null,
			null, START, START.minusDays(1), false, null)));
	}

	@Test
	@Transactional
	void testSubscriptionAcceptsABackdatedCycleInsideItsWindow() throws BusinessException {
		PaymentPlanDto plan = paymentPlanService.create(planDto(
			"Rent", PaymentPlanType.RECURRING, null, null,
			RecurrenceFrequency.MONTHLY, START, START.plusMonths(6), false, null));

		PaymentPlanItemDto backdated = paymentPlanService.createItem(plan.id(), itemDto(START.plusMonths(1)));
		assertEquals(START.plusMonths(1), backdated.expectedDate());

		assertThrows(BusinessException.class, () -> paymentPlanService.createItem(plan.id(), itemDto(START.minusDays(1))));
		assertThrows(BusinessException.class, () -> paymentPlanService.createItem(plan.id(), itemDto(START.plusMonths(7))));
	}

	@Test
	@Transactional
	void testInstallmentPlanNeverHoldsMoreCuotasThanItDeclares() throws BusinessException {
		PaymentPlanDto plan = paymentPlanService.create(planDto(
			"Laptop", PaymentPlanType.INSTALLMENT, 3, null,
			RecurrenceFrequency.MONTHLY, START, null, false, null));

		BusinessException ex = assertThrows(BusinessException.class,
			() -> paymentPlanService.createItem(plan.id(), itemDto(START)));
		assertTrue(ex.getMessage().contains("3"));
	}

	@Test
	@Transactional
	void testGroupMembersAreNotBoundToTheGroupDate() throws BusinessException {
		PaymentPlanDto group = paymentPlanService.create(new CreatePaymentPlanDto(
			"Bariloche trip", null, PaymentPlanType.GROUP, null, null, null, null,
			START, null, false, false, null, false, null, null, List.of(), null, null, null));

		PaymentPlanItemDto member = paymentPlanService.createItem(group.id(), itemDto(START.minusMonths(2)));
		assertEquals(START.minusMonths(2), member.expectedDate());
	}

	@Test
	void attachingSeveralEventsAtOnceGivesEachOneItsOwnEntry() throws BusinessException {
		PaymentPlanDto plan = paymentPlanService.create(planDto(
			"Book saga", PaymentPlanType.CUSTOM, null, null,
			null, START, START.plusMonths(11), false, null));

		List<Long> eventIds = List.of(
			createEvent("Book 1", START).id(),
			createEvent("Book 2", START.plusMonths(2)).id(),
			createEvent("Book 3", START.plusMonths(5)).id());

		PaymentPlanDto attached = paymentPlanService.attachMembers(plan.id(), new AttachToPaymentPlanDto(eventIds, null, null));

		assertEquals(3, attached.items().size());
		assertEquals(new HashSet<>(eventIds), new HashSet<>(attached.items().stream().map(PaymentPlanItemDto::eventId).toList()));
	}

	@Test
	void attachingSeveralEventsFillsThePreGeneratedCuotasInsteadOfOpeningNewOnes() throws BusinessException {
		PaymentPlanDto plan = paymentPlanService.create(planDto(
			"Guitar", PaymentPlanType.INSTALLMENT, 3, new BigDecimal("100.00"),
			RecurrenceFrequency.MONTHLY, START, null, false, null));

		List<Long> eventIds = List.of(
			createEvent("Cuota 1", START).id(),
			createEvent("Cuota 2", START.plusMonths(1)).id(),
			createEvent("Cuota 3", START.plusMonths(2)).id());

		PaymentPlanDto attached = paymentPlanService.attachMembers(plan.id(), new AttachToPaymentPlanDto(eventIds, null, null));

		assertEquals(3, attached.items().size());
		assertEquals(new HashSet<>(eventIds), new HashSet<>(attached.items().stream().map(PaymentPlanItemDto::eventId).toList()));
	}

	@Test
	void namingASpecificEntryIsRejectedWhenSeveralMembersAreAttached() throws BusinessException {
		PaymentPlanDto plan = paymentPlanService.create(planDto(
			"Ambiguous", PaymentPlanType.CUSTOM, null, null,
			null, START, START.plusMonths(6), false, null));

		List<Long> eventIds = List.of(createEvent("First", START).id(), createEvent("Second", START).id());
		Long firstItemId = paymentPlanService.createItem(plan.id(), itemDto(START)).id();

		assertThrows(BusinessException.class,
			() -> paymentPlanService.attachMembers(plan.id(), new AttachToPaymentPlanDto(eventIds, null, firstItemId)));
		assertThrows(BusinessException.class,
			() -> paymentPlanService.attachMembers(plan.id(), new AttachToPaymentPlanDto(null, null, null)));
	}

	private FinanceEventDto createEvent(String name, LocalDate when) throws BusinessException {
		FinanceNodeEntity wallet = createNode(name + " Wallet", FinanceNodeType.OWN);
		FinanceNodeEntity store = createNode(name + " Store", FinanceNodeType.EXTERNAL);

		FinanceTransactionEntity transaction = new FinanceTransactionEntity();
		transaction.transactionDate = LocalDateTime.of(when, LocalTime.NOON);
		transaction.lineItems.add(lineItem(store, new BigDecimal("10.00")));
		transaction.lineItems.add(lineItem(wallet, new BigDecimal("-10.00")));

		FinanceEventEntity event = new FinanceEventEntity();
		event.name = name;
		event.type = EventType.OUTBOUND;
		event.transaction = transaction;

		return eventService.create(event);
	}

	private FinanceNodeEntity createNode(String name, FinanceNodeType type) throws BusinessException {
		FinanceNodeDto created = financeNodeService.create(new FinanceNodeDto(null, name, type, null, null, null, false, null));
		FinanceNodeEntity node = new FinanceNodeEntity();
		node.id = created.id();
		return node;
	}

	private FinanceLineItemEntity lineItem(FinanceNodeEntity node, BigDecimal amount) {
		FinanceLineItemEntity lineItem = new FinanceLineItemEntity();
		lineItem.financeNode = node;
		lineItem.amount = amount;
		lineItem.currency = "USD";
		return lineItem;
	}
}
