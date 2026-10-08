package com.mypaybyday.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import jakarta.inject.Inject;

import com.mypaybyday.dto.FileDto;
import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.FinanceLineItemDto;
import com.mypaybyday.dto.FinanceNodeDto;
import com.mypaybyday.dto.MergeEventsRequestDto;
import com.mypaybyday.dto.MergePreviewDto;
import com.mypaybyday.dto.ValidationErrorDto;
import com.mypaybyday.entity.FileEntity;
import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.entity.FinanceLineItemEntity;
import com.mypaybyday.entity.FinanceNodeEntity;
import com.mypaybyday.entity.FinanceTransactionEntity;
import com.mypaybyday.enums.EventType;
import com.mypaybyday.enums.FinanceNodeType;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.event.EventService;

import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@QuarkusTest
class EventMergeServiceTest {

	private static final LocalDate MERGE_DAY = LocalDate.of(2026, 3, 4);

	@Inject
	EventService eventService;

	@Inject
	FinanceNodeService financeNodeService;

	@Test
	void mergeKeepsAttachmentsOfEverySourceEvent() throws BusinessException {
		Long baseReceipt = createFile("base-receipt.pdf");
		Long firstSourceReceipt = createFile("first-source-receipt.pdf");
		Long secondSourceReceipt = createFile("second-source-receipt.pdf");

		FinanceEventDto baseEvent = createEvent("Groceries base", MERGE_DAY, List.of(baseReceipt));
		FinanceEventDto firstSource = createEvent("Groceries first", MERGE_DAY, List.of(firstSourceReceipt));
		FinanceEventDto secondSource = createEvent("Groceries second", MERGE_DAY, List.of(secondSourceReceipt));

		FinanceEventDto merged = mergeInto(baseEvent, List.of(firstSource.id(), secondSource.id()));

		assertEquals(
			Set.of(baseReceipt, firstSourceReceipt, secondSourceReceipt),
			fileIdsOf(merged));
		assertEquals(
			Set.of(baseReceipt, firstSourceReceipt, secondSourceReceipt),
			fileIdsOf(eventService.findById(baseEvent.id())));

		assertThrows(BusinessException.class, () -> eventService.findById(firstSource.id()));
		assertThrows(BusinessException.class, () -> eventService.findById(secondSource.id()));
	}

	@Test
	void mergeGivesAttachmentsToABaseEventThatHadNone() throws BusinessException {
		Long sourceReceipt = createFile("only-source-receipt.pdf");

		FinanceEventDto baseEvent = createEvent("Dinner base", MERGE_DAY, List.of());
		FinanceEventDto source = createEvent("Dinner source", MERGE_DAY, List.of(sourceReceipt));

		FinanceEventDto merged = mergeInto(baseEvent, List.of(source.id()));

		assertEquals(Set.of(sourceReceipt), fileIdsOf(merged));
		assertEquals(Set.of(sourceReceipt), fileIdsOf(eventService.findById(baseEvent.id())));
	}

	@Test
	void mergeDoesNotDuplicateAnAttachmentSharedWithASourceEvent() throws BusinessException {
		Long sharedInvoice = createFile("shared-invoice.pdf");
		Long sourceOnlyInvoice = createFile("source-only-invoice.pdf");

		FinanceEventDto baseEvent = createEvent("Rent base", MERGE_DAY, List.of(sharedInvoice));
		FinanceEventDto source = createEvent("Rent source", MERGE_DAY, List.of(sharedInvoice, sourceOnlyInvoice));

		FinanceEventDto merged = mergeInto(baseEvent, List.of(source.id()));

		assertEquals(2, merged.files().size());
		assertEquals(Set.of(sharedInvoice, sourceOnlyInvoice), fileIdsOf(merged));
	}

	@Test
	void mergedAttachmentsAreStillOwnedByAnEventAfterTheSourceIsDeleted() throws BusinessException {
		Long sourceReceipt = createFile("kept-after-delete.pdf");

		FinanceEventDto baseEvent = createEvent("Taxi base", MERGE_DAY, List.of());
		FinanceEventDto source = createEvent("Taxi source", MERGE_DAY, List.of(sourceReceipt));

		mergeInto(baseEvent, List.of(source.id()));

		assertNotNull(QuarkusTransaction.requiringNew().call(() -> FileEntity.<FileEntity>findById(sourceReceipt)));
		assertTrue(fileIdsOf(eventService.findById(baseEvent.id())).contains(sourceReceipt));
	}

	@Test
	void mergingEventsInDifferentCurrenciesIsRejectedAndChangesNothing() throws BusinessException {
		FinanceEventDto dollarLunch = createEvent("Lunch in dollars", MERGE_DAY, List.of(), "USD");
		FinanceEventDto pesoLunch = createEvent("Lunch in pesos", MERGE_DAY, List.of(), "UYU");

		assertThrows(BusinessException.class, () -> mergeInto(dollarLunch, List.of(pesoLunch.id())));

		assertEquals(2, eventService.findById(dollarLunch.id()).lineItems().size());
		assertEquals("UYU", eventService.findById(pesoLunch.id()).currency());
	}

	@Test
	void previewReportsMixedCurrenciesWithoutPersistingAnything() throws BusinessException {
		FinanceEventDto dollarFare = createEvent("Fare in dollars", MERGE_DAY, List.of(), "USD");
		FinanceEventDto pesoFare = createEvent("Fare in pesos", MERGE_DAY, List.of(), "UYU");

		MergePreviewDto preview = eventService.previewMerge(dollarFare.id(), mergeRequest(List.of(pesoFare.id()), List.of()));

		assertFalse(preview.valid());
		assertTrue(preview.errors().stream().anyMatch(error -> ValidationErrorDto.CURRENCY_FIELD.equals(error.field())));
		assertEquals(2, eventService.findById(dollarFare.id()).lineItems().size());
		assertNotNull(eventService.findById(pesoFare.id()));
	}

	@Test
	void groupedNodesAddUpIntoOneBalancedLineItemEach() throws BusinessException {
		FinanceNodeEntity wallet = createNode("Shared wallet", FinanceNodeType.OWN);
		FinanceNodeEntity store = createNode("Shared store", FinanceNodeType.EXTERNAL);
		FinanceEventDto morning = createEvent("Morning coffee", wallet, store, "USD");
		FinanceEventDto afternoon = createEvent("Afternoon coffee", wallet, store, "USD");

		FinanceEventDto merged = eventService.mergeEvents(morning.id(),
				mergeRequest(List.of(afternoon.id()), List.of(wallet.id, store.id)));

		Map<Long, BigDecimal> amountByNode = merged.lineItems().stream()
				.collect(Collectors.toMap(FinanceLineItemDto::financeNodeId, FinanceLineItemDto::amount));
		assertEquals(Map.of(wallet.id, new BigDecimal("-20.00"), store.id, new BigDecimal("20.00")), amountByNode);
		assertThrows(BusinessException.class, () -> eventService.findById(afternoon.id()));
	}

	private FinanceEventDto mergeInto(FinanceEventDto baseEvent, List<Long> sourceIds) throws BusinessException {
		return eventService.mergeEvents(baseEvent.id(), mergeRequest(sourceIds, List.of()));
	}

	private static MergeEventsRequestDto mergeRequest(List<Long> sourceIds, List<Long> groupByNodeIds) {
		MergeEventsRequestDto request = new MergeEventsRequestDto();
		request.sourceIds = sourceIds;
		request.groupByNodeIds = groupByNodeIds;
		return request;
	}

	private Set<Long> fileIdsOf(FinanceEventDto event) {
		return event.files().stream().map(FileDto::id).collect(Collectors.toSet());
	}

	private Long createFile(String fileName) {
		return QuarkusTransaction.requiringNew().call(() -> {
			FileEntity file = new FileEntity();
			file.fileName = fileName;
			file.mimeType = "application/pdf";
			file.data = fileName.getBytes();
			file.size = file.data.length;
			file.persist();
			return file.id;
		});
	}

	private FinanceEventDto createEvent(String name, LocalDate when, List<Long> fileIds) throws BusinessException {
		return createEvent(name, when, fileIds, "USD");
	}

	private FinanceEventDto createEvent(String name, LocalDate when, List<Long> fileIds, String currency)
			throws BusinessException {
		FinanceNodeEntity wallet = createNode(name + " Wallet", FinanceNodeType.OWN);
		FinanceNodeEntity store = createNode(name + " Store", FinanceNodeType.EXTERNAL);
		return createEvent(name, when, fileIds, wallet, store, currency);
	}

	private FinanceEventDto createEvent(String name, FinanceNodeEntity wallet, FinanceNodeEntity store, String currency)
			throws BusinessException {
		return createEvent(name, MERGE_DAY, List.of(), wallet, store, currency);
	}

	private FinanceEventDto createEvent(String name, LocalDate when, List<Long> fileIds, FinanceNodeEntity wallet,
			FinanceNodeEntity store, String currency) throws BusinessException {
		FinanceTransactionEntity transaction = new FinanceTransactionEntity();
		transaction.transactionDate = LocalDateTime.of(when, LocalTime.NOON);
		transaction.lineItems.add(lineItem(store, new BigDecimal("10.00"), currency));
		transaction.lineItems.add(lineItem(wallet, new BigDecimal("-10.00"), currency));

		FinanceEventEntity event = new FinanceEventEntity();
		event.name = name;
		event.type = EventType.OUTBOUND;
		event.transaction = transaction;
		event.fileIds = fileIds;

		return eventService.create(event);
	}

	private FinanceNodeEntity createNode(String name, FinanceNodeType type) throws BusinessException {
		FinanceNodeDto created = financeNodeService.create(new FinanceNodeDto(null, name, type, null, null, null, false, null));
		FinanceNodeEntity node = new FinanceNodeEntity();
		node.id = created.id();
		return node;
	}

	private FinanceLineItemEntity lineItem(FinanceNodeEntity node, BigDecimal amount, String currency) {
		FinanceLineItemEntity lineItem = new FinanceLineItemEntity();
		lineItem.financeNode = node;
		lineItem.amount = amount;
		lineItem.currency = currency;
		return lineItem;
	}
}
