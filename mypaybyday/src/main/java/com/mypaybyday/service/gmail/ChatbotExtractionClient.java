package com.mypaybyday.service.gmail;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import jakarta.enterprise.context.ApplicationScoped;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mypaybyday.config.GmailIngestionConfig;
import com.mypaybyday.filter.CorrelationIdFilter;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.MDC;

/**
 * HTTP client for the chatbot's {@code POST /ai/extract}, which stages a draft from already stored
 * files. Extraction runs a tool-calling agent loop, hence the generous timeout.
 */
@ApplicationScoped
public class ChatbotExtractionClient {

	private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);

	private static final Duration REQUEST_TIMEOUT = Duration.ofMinutes(5);

	private static final String EXTRACT_PATH = "/ai/extract";

	private static final String SOURCE = "backend:gmail-ingestion";

	private static final int ERROR_BODY_MAX_LENGTH = 500;

	private final ObjectMapper objectMapper;

	private final GmailIngestionConfig config;

	private final Optional<String> chatbotUrl;

	private final HttpClient httpClient;

	public ChatbotExtractionClient(ObjectMapper objectMapper, GmailIngestionConfig config,
			@ConfigProperty(name = "mypaybyday.chatbot.url") Optional<String> chatbotUrl) {
		this.objectMapper = objectMapper;
		this.config = config;
		this.chatbotUrl = chatbotUrl.filter(url -> !url.isBlank());
		this.httpClient = HttpClient.newBuilder().connectTimeout(CONNECT_TIMEOUT).build();
	}

	public boolean isConfigured() {
		return chatbotUrl.isPresent();
	}

	public void extractDraftFromFile(long fileId) {
		try {
			HttpResponse<String> response = httpClient.send(extractRequest(fileId), HttpResponse.BodyHandlers.ofString());
			if (response.statusCode() < 200 || response.statusCode() >= 300) {
				throw new IllegalStateException("Chatbot answered HTTP " + response.statusCode() + ": " + truncated(response.body()));
			}
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			throw new IllegalStateException("Chatbot extraction was interrupted", e);
		} catch (IOException e) {
			throw new IllegalStateException("Chatbot extraction failed: " + e.getMessage(), e);
		}
	}

	private HttpRequest extractRequest(long fileId) throws JsonProcessingException {
		String payload = objectMapper.writeValueAsString(Map.of("fileIds", List.of(fileId)));
		HttpRequest.Builder request = HttpRequest.newBuilder()
			.uri(URI.create(chatbotUrl.orElseThrow() + EXTRACT_PATH))
			.timeout(REQUEST_TIMEOUT)
			.header("Content-Type", "application/json")
			.header("X-Timezone", config.timezone())
			.header("X-Language", config.language())
			.header("X-Currency", config.currency())
			.header(CorrelationIdFilter.SOURCE_HEADER, SOURCE);
		Object requestId = MDC.get(CorrelationIdFilter.MDC_KEY);
		if (requestId != null) {
			request.header(CorrelationIdFilter.REQUEST_ID_HEADER, requestId.toString());
		}
		return request.POST(HttpRequest.BodyPublishers.ofString(payload)).build();
	}

	private static String truncated(String body) {
		return body.length() > ERROR_BODY_MAX_LENGTH ? body.substring(0, ERROR_BODY_MAX_LENGTH) : body;
	}
}
