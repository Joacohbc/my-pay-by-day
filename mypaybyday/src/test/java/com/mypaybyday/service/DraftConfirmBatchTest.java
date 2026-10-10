package com.mypaybyday.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import jakarta.inject.Inject;

import com.mypaybyday.dto.ConfirmDraftsResultDto;
import com.mypaybyday.dto.DraftConfirmFailureDto;
import com.mypaybyday.dto.FinanceEventDraftInputDto;
import com.mypaybyday.dto.FinanceLineItemDto;
import com.mypaybyday.dto.FinanceNodeDto;
import com.mypaybyday.dto.ValidationErrorDto;
import com.mypaybyday.enums.DraftConfirmMode;
import com.mypaybyday.enums.EventType;
import com.mypaybyday.enums.FinanceNodeType;
import com.mypaybyday.exception.BusinessException;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@QuarkusTest
class DraftConfirmBatchTest {

	private static final LocalDateTime PURCHASE_TIME = LocalDateTime.of(2026, 3, 4, 12, 0);

	@Inject
	DraftService draftService;

	@Inject
	FinanceNodeService financeNodeService;

	@Test
	void oneInvalidDraftKeepsTheWholeBatchFromBeingConfirmed() throws BusinessException {
		Long valid = createDraft("Complete draft", "Batch wallet", "Batch store");
		Long nameless = createDraft(null, "Nameless wallet", "Nameless store");

		ConfirmDraftsResultDto result = draftService.confirmDraftsBatch(List.of(valid, nameless), DraftConfirmMode.MERGE);

		assertTrue(result.confirmedEvents().isEmpty());
		assertEquals(1, result.failedDrafts().size());
		DraftConfirmFailureDto failure = result.failedDrafts().get(0);
		assertEquals(nameless, failure.draftId());
		assertTrue(failure.errors().stream().anyMatch(error -> ValidationErrorDto.NAME_FIELD.equals(error.field())));
		assertTrue(draftExists(valid));
		assertTrue(draftExists(nameless));
	}

	@Test
	void aValidBatchConfirmsEveryDraft() throws BusinessException {
		Long first = createDraft("First complete draft", "First wallet", "First store");
		Long second = createDraft("Second complete draft", "Second wallet", "Second store");

		ConfirmDraftsResultDto result = draftService.confirmDraftsBatch(List.of(first, second), DraftConfirmMode.CREATE_ONLY);

		assertEquals(2, result.confirmedEvents().size());
		assertTrue(result.failedDrafts().isEmpty());
		assertFalse(draftExists(first));
		assertFalse(draftExists(second));
	}

	private boolean draftExists(Long draftId) {
		return draftService.listFinanceEventDrafts().stream().anyMatch(draft -> draftId.equals(draft.draftId()));
	}

	private Long createDraft(String name, String walletName, String storeName) throws BusinessException {
		Long wallet = createNode(walletName, FinanceNodeType.OWN);
		Long store = createNode(storeName, FinanceNodeType.EXTERNAL);
		BigDecimal spent = new BigDecimal("10.00");
		List<FinanceLineItemDto> lineItems = List.of(
				new FinanceLineItemDto(wallet, null, null, spent.negate(), "USD"),
				new FinanceLineItemDto(store, null, null, spent, "USD"));
		return draftService.createStandaloneFinanceEventDraft(new FinanceEventDraftInputDto(
				null, name, null, EventType.OUTBOUND, PURCHASE_TIME, null, null, lineItems, null)).id;
	}

	private Long createNode(String name, FinanceNodeType type) throws BusinessException {
		return financeNodeService.create(new FinanceNodeDto(null, name, type, null, null, null, false, null)).id();
	}
}
