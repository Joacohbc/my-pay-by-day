package com.mypaybyday.service.gmail;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;

import com.fasterxml.jackson.databind.JsonNode;
import com.mypaybyday.dto.GmailMessageDto;

@ApplicationScoped
public class GmailMessageMapper {

	private static final String PLAIN_TEXT_MIME_TYPE = "text/plain";

	private static final String HTML_MIME_TYPE = "text/html";

	private static final String RECIPIENT_SEPARATOR = ",";

	public GmailMessageDto toMessage(JsonNode apiMessage) {
		JsonNode payload = apiMessage.path("payload");
		return new GmailMessageDto(
			apiMessage.path("id").asText(),
			headerValue(payload, "Subject"),
			headerValue(payload, "From"),
			recipientsOf(headerValue(payload, "To")),
			sentAtOf(apiMessage),
			bodyOfType(payload, HTML_MIME_TYPE),
			bodyOfType(payload, PLAIN_TEXT_MIME_TYPE)
		);
	}

	private LocalDateTime sentAtOf(JsonNode apiMessage) {
		long epochMillis = apiMessage.path("internalDate").asLong();
		return LocalDateTime.ofInstant(Instant.ofEpochMilli(epochMillis), ZoneOffset.UTC);
	}

	private String headerValue(JsonNode payload, String headerName) {
		for (JsonNode header : payload.path("headers")) {
			if (headerName.equalsIgnoreCase(header.path("name").asText())) {
				return header.path("value").asText();
			}
		}
		return null;
	}

	private List<String> recipientsOf(String toHeader) {
		if (toHeader == null) {
			return List.of();
		}
		return Arrays.stream(toHeader.split(RECIPIENT_SEPARATOR))
			.map(String::trim)
			.filter(recipient -> !recipient.isEmpty())
			.toList();
	}

	private String bodyOfType(JsonNode part, String mimeType) {
		boolean isMatchingPart = mimeType.equals(part.path("mimeType").asText());
		String encodedBody = part.path("body").path("data").asText("");
		if (isMatchingPart && !encodedBody.isEmpty()) {
			return new String(Base64.getUrlDecoder().decode(encodedBody), StandardCharsets.UTF_8);
		}
		for (JsonNode child : part.path("parts")) {
			String childBody = bodyOfType(child, mimeType);
			if (childBody != null) {
				return childBody;
			}
		}
		return null;
	}
}
