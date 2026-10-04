package com.mypaybyday.service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.DataTransferResult;
import com.mypaybyday.dto.SectionImportResult;
import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.entity.FinanceLineItemEntity;
import com.mypaybyday.enums.DataSection;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.repository.EventRepository;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Archives exported before amounts carried a currency must still restore: the user names the
 * currency their amounts were in.
 */
@QuarkusTest
class LegacyArchiveImportTest {

	private static final String LEGACY_EVENT_NAME = "Legacy Archive Dinner";
	private static final String LEGACY_ARCHIVE_JSON = """
			{
			  "version": "1.0",
			  "exportedAt": "2025-01-01T00:00:00",
			  "financeNodes": [
			    {"id": 901, "name": "Legacy Archive Wallet", "type": "OWN", "archived": false},
			    {"id": 902, "name": "Legacy Archive Store", "type": "EXTERNAL", "archived": false}
			  ],
			  "events": [
			    {
			      "id": 903,
			      "name": "%s",
			      "type": "OUTBOUND",
			      "transactionDate": "2017-06-10T12:00:00",
			      "lineItems": [
			        {"financeNodeId": 901, "amount": -100.00},
			        {"financeNodeId": 902, "amount": 100.00}
			      ]
			    }
			  ]
			}
			""".formatted(LEGACY_EVENT_NAME);

	@Inject
	DataTransferService dataTransferService;

	@Inject
	EventRepository eventRepository;

	@Test
	@Transactional
	void amountsWithoutACurrencyAreImportedInTheChosenLegacyCurrency() throws BusinessException, IOException {
		DataTransferResult result = dataTransferService.importFromZip(zipOf(LEGACY_ARCHIVE_JSON), "uyu");

		SectionImportResult events = result.sections().stream()
				.filter(section -> section.section() == DataSection.EVENTS)
				.findFirst()
				.orElseThrow();
		assertTrue(events.skipped().isEmpty(), () -> "skipped: " + events.skipped());
		assertEquals(1, events.imported());

		FinanceEventEntity dinner = eventRepository.listAll().stream()
				.filter(event -> LEGACY_EVENT_NAME.equals(event.name))
				.findFirst()
				.orElseThrow();
		for (FinanceLineItemEntity lineItem : dinner.transaction.lineItems) {
			assertEquals("UYU", lineItem.currency);
		}
	}

	private static ByteArrayInputStream zipOf(String dataJson) throws IOException {
		ByteArrayOutputStream archive = new ByteArrayOutputStream();
		try (ZipOutputStream zip = new ZipOutputStream(archive)) {
			zip.putNextEntry(new ZipEntry("data.json"));
			zip.write(dataJson.getBytes(StandardCharsets.UTF_8));
			zip.closeEntry();
		}
		return new ByteArrayInputStream(archive.toByteArray());
	}
}
