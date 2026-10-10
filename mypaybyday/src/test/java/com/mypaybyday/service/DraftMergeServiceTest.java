package com.mypaybyday.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import jakarta.inject.Inject;

import com.mypaybyday.dto.CreatePaymentPlanDto;
import com.mypaybyday.dto.FinanceEventDraftInputDto;
import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.FinanceLineItemDto;
import com.mypaybyday.dto.FinanceNodeDto;
import com.mypaybyday.dto.MergeEventsRequestDto;
import com.mypaybyday.dto.MergePreviewDto;
import com.mypaybyday.dto.ValidationErrorDto;
import com.mypaybyday.enums.DraftConfirmMode;
import com.mypaybyday.enums.EventType;
import com.mypaybyday.enums.FinanceNodeType;
import com.mypaybyday.enums.PaymentPlanType;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.event.EventService;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@QuarkusTest
class DraftMergeServiceTest {

	private static final LocalDateTime PURCHASE_TIME = LocalDateTime.of(2026, 3, 4, 12, 0);

	@Inject
	DraftMergeService draftMergeService;

	@Inject
	DraftService draftService;

	@Inject
	EventService eventService;

	@Inject
	FinanceNodeService financeNodeService;

	@Inject
	PaymentPlanService paymentPlanService;

	@Test
	void twoDraftsBecomeOneEventAndBothDraftsAreGone() throws BusinessException {
		Long wallet = createNode("Merge wallet", FinanceNodeType.OWN);
		Long store = createNode("Merge store", FinanceNodeType.EXTERNAL);
		Long bread = createDraft("Bread", PURCHASE_TIME, wallet, store, "10.00", "USD");
		Long milk = createDraft("Milk", PURCHASE_TIME, wallet, store, "15.00", "USD");

		FinanceEventDto merged = draftMergeService.mergeDrafts(bread, mergeRequest(List.of(milk), List.of(wallet, store)));

		Map<Long, BigDecimal> amountByNode = eventService.findById(merged.id()).lineItems().stream()
				.collect(Collectors.toMap(FinanceLineItemDto::financeNodeId, FinanceLineItemDto::amount));
		assertEquals(0, new BigDecimal("-25").compareTo(amountByNode.get(wallet)));
		assertEquals(0, new BigDecimal("25").compareTo(amountByNode.get(store)));
		assertEquals("Bread", merged.name());
		assertFalse(draftExists(bread));
		assertFalse(draftExists(milk));
	}

	@Test
	void aDraftEditingAnExistingEventCannotBeMerged() throws BusinessException {
		Long wallet = createNode("Linked wallet", FinanceNodeType.OWN);
		Long store = createNode("Linked store", FinanceNodeType.EXTERNAL);
		Long confirmed = createDraft("Already an event", PURCHASE_TIME, wallet, store, "10.00", "USD");
		Long eventId = draftService.confirmDraftsBatch(List.of(confirmed), DraftConfirmMode.CREATE_ONLY)
				.confirmedEvents().get(0).id();
		Long editingDraft = draftService.upsertFinanceEventDraftByEventId(eventId, draftInput("Editing it",
				PURCHASE_TIME, wallet, store, "12.00", "USD")).id;
		Long freestanding = createDraft("Freestanding", PURCHASE_TIME, wallet, store, "5.00", "USD");

		MergePreviewDto preview = draftMergeService.previewMerge(freestanding, mergeRequest(List.of(editingDraft), List.of()));

		assertHasError(preview, ValidationErrorDto.SOURCES_FIELD);
	}

	@Test
	void aDraftInAPaymentPlanCannotBeMerged() throws BusinessException {
		Long wallet = createNode("Plan wallet", FinanceNodeType.OWN);
		Long store = createNode("Plan store", FinanceNodeType.EXTERNAL);
		Long planned = createDraft("Planned dinner", PURCHASE_TIME, wallet, store, "30.00", "USD");
		Long freestanding = createDraft("Loose dinner", PURCHASE_TIME, wallet, store, "20.00", "USD");
		paymentPlanService.create(new CreatePaymentPlanDto(
				"Trip", null, PaymentPlanType.GROUP, null, null, null, null,
				PURCHASE_TIME.toLocalDate(), null, false, false, null, false, null, null, List.of(), null,
				List.of(planned), null));

		MergePreviewDto preview = draftMergeService.previewMerge(freestanding, mergeRequest(List.of(planned), List.of()));

		assertHasError(preview, ValidationErrorDto.SOURCES_FIELD);
	}

	@Test
	void aSourceMissingItsDateBlocksTheMergeAndCreatesNothing() throws BusinessException {
		Long wallet = createNode("Undated wallet", FinanceNodeType.OWN);
		Long store = createNode("Undated store", FinanceNodeType.EXTERNAL);
		Long dated = createDraft("Dated", PURCHASE_TIME, wallet, store, "10.00", "USD");
		Long undated = createDraft("Undated", null, wallet, store, "10.00", "USD");
		MergeEventsRequestDto request = mergeRequest(List.of(undated), List.of());

		assertHasError(draftMergeService.previewMerge(dated, request), ValidationErrorDto.SOURCES_FIELD);
		assertThrows(BusinessException.class, () -> draftMergeService.mergeDrafts(dated, request));
		assertTrue(draftExists(dated));
		assertTrue(draftExists(undated));
	}

	@Test
	void draftsInDifferentCurrenciesCannotBeMerged() throws BusinessException {
		Long wallet = createNode("Currency wallet", FinanceNodeType.OWN);
		Long store = createNode("Currency store", FinanceNodeType.EXTERNAL);
		Long dollars = createDraft("Paid in dollars", PURCHASE_TIME, wallet, store, "10.00", "USD");
		Long pesos = createDraft("Paid in pesos", PURCHASE_TIME, wallet, store, "400.00", "UYU");

		MergePreviewDto preview = draftMergeService.previewMerge(dollars, mergeRequest(List.of(pesos), List.of()));

		assertHasError(preview, ValidationErrorDto.CURRENCY_FIELD);
	}

	private static void assertHasError(MergePreviewDto preview, String field) {
		assertFalse(preview.valid());
		assertTrue(preview.errors().stream().anyMatch(error -> field.equals(error.field())), () -> "errors: " + preview.errors());
	}

	private boolean draftExists(Long draftId) {
		return draftService.listFinanceEventDrafts().stream().anyMatch(draft -> draftId.equals(draft.draftId()));
	}

	private Long createDraft(String name, LocalDateTime when, Long wallet, Long store, String amount, String currency)
			throws BusinessException {
		return draftService.createStandaloneFinanceEventDraft(draftInput(name, when, wallet, store, amount, currency)).id;
	}

	private static FinanceEventDraftInputDto draftInput(String name, LocalDateTime when, Long wallet, Long store,
			String amount, String currency) {
		BigDecimal spent = new BigDecimal(amount);
		List<FinanceLineItemDto> lineItems = List.of(
				new FinanceLineItemDto(wallet, null, null, spent.negate(), currency),
				new FinanceLineItemDto(store, null, null, spent, currency));
		return new FinanceEventDraftInputDto(null, name, null, EventType.OUTBOUND, when, null, null, lineItems, null);
	}

	private static MergeEventsRequestDto mergeRequest(List<Long> sourceIds, List<Long> groupByNodeIds) {
		MergeEventsRequestDto request = new MergeEventsRequestDto();
		request.sourceIds = sourceIds;
		request.groupByNodeIds = groupByNodeIds;
		return request;
	}

	private Long createNode(String name, FinanceNodeType type) throws BusinessException {
		return financeNodeService.create(new FinanceNodeDto(null, name, type, null, null, null, false, null)).id();
	}
}
