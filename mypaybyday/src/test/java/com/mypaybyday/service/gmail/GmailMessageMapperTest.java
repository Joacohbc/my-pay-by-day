package com.mypaybyday.service.gmail;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mypaybyday.dto.GmailMessageDto;
import org.junit.jupiter.api.Test;

class GmailMessageMapperTest {

	private static final String EPOCH_2026_08_28_12_30_UTC_MILLIS = "1787920200000";

	private final ObjectMapper objectMapper = new ObjectMapper();

	private final GmailMessageMapper mapper = new GmailMessageMapper();

	@Test
	void mapsHeadersAndBothBodiesOfAMultipartMessage() throws Exception {
		JsonNode apiMessage = objectMapper.readTree("""
			{"id":"abc","internalDate":"%s","payload":{"mimeType":"multipart/alternative",
			"headers":[{"name":"subject","value":"Compra"},{"name":"From","value":"alertas@banco.uy"},
			{"name":"To","value":"a@x.com, b@x.com"}],
			"parts":[{"mimeType":"text/plain","body":{"data":"%s"}},{"mimeType":"text/html","body":{"data":"%s"}}]}}
			""".formatted(EPOCH_2026_08_28_12_30_UTC_MILLIS, encoded("texto"), encoded("<p>html</p>")));

		GmailMessageDto message = mapper.toMessage(apiMessage);

		assertEquals("abc", message.id());
		assertEquals("Compra", message.subject());
		assertEquals("alertas@banco.uy", message.from());
		assertEquals(List.of("a@x.com", "b@x.com"), message.to());
		assertEquals(LocalDateTime.of(2026, 8, 28, 12, 30), message.sentAt());
		assertEquals("texto", message.textBody());
		assertEquals("<p>html</p>", message.htmlBody());
	}

	@Test
	void findsBodiesNestedInsideInnerMultipartParts() throws Exception {
		JsonNode apiMessage = objectMapper.readTree("""
			{"id":"n","internalDate":"0","payload":{"mimeType":"multipart/mixed","headers":[],
			"parts":[{"mimeType":"multipart/alternative","parts":[{"mimeType":"text/html","body":{"data":"%s"}}]}]}}
			""".formatted(encoded("<b>x</b>")));

		GmailMessageDto message = mapper.toMessage(apiMessage);

		assertEquals("<b>x</b>", message.htmlBody());
		assertNull(message.textBody());
		assertEquals(List.of(), message.to());
	}

	private static String encoded(String text) {
		return Base64.getUrlEncoder().encodeToString(text.getBytes(StandardCharsets.UTF_8));
	}
}
