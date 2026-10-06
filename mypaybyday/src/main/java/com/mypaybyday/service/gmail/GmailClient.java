package com.mypaybyday.service.gmail;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import jakarta.enterprise.context.ApplicationScoped;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mypaybyday.config.GmailIngestionConfig;
import com.mypaybyday.dto.GmailMessageDto;

/**
 * HTTP client for the Gmail API of the single mailbox the refresh token belongs to. Every failure
 * is raised as an {@link IllegalStateException} carrying Google's status and body, so a revoked
 * grant ({@code invalid_grant}) is never mistaken for an empty mailbox.
 */
@ApplicationScoped
public class GmailClient {

	private static final String TOKEN_URL = "https://oauth2.googleapis.com/token";

	private static final String MAILBOX_URL = "https://gmail.googleapis.com/gmail/v1/users/me";

	private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);

	private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(30);

	private static final Duration TOKEN_EXPIRY_MARGIN = Duration.ofMinutes(1);

	private static final int ERROR_BODY_MAX_LENGTH = 500;

	private final ObjectMapper objectMapper;

	private final GmailIngestionConfig config;

	private final GmailMessageMapper messageMapper;

	private final HttpClient httpClient;

	private String accessToken;

	private Instant accessTokenExpiresAt = Instant.EPOCH;

	public GmailClient(ObjectMapper objectMapper, GmailIngestionConfig config, GmailMessageMapper messageMapper) {
		this.objectMapper = objectMapper;
		this.config = config;
		this.messageMapper = messageMapper;
		this.httpClient = HttpClient.newBuilder().connectTimeout(CONNECT_TIMEOUT).build();
	}

	public boolean hasCredentials() {
		return isPresent(config.clientId()) && isPresent(config.clientSecret()) && isPresent(config.refreshToken());
	}

	public List<String> searchMessageIds(String query, int maxResults) {
		String url = MAILBOX_URL + "/messages?maxResults=" + maxResults + "&q=" + encode(query);
		List<String> messageIds = new ArrayList<>();
		for (JsonNode message : getJson(url).path("messages")) {
			messageIds.add(message.path("id").asText());
		}
		return messageIds;
	}

	public GmailMessageDto getMessage(String messageId) {
		return messageMapper.toMessage(getJson(MAILBOX_URL + "/messages/" + messageId + "?format=full"));
	}

	public Optional<String> findLabelId(String labelName) {
		for (JsonNode label : getJson(MAILBOX_URL + "/labels").path("labels")) {
			if (labelName.equals(label.path("name").asText())) {
				return Optional.of(label.path("id").asText());
			}
		}
		return Optional.empty();
	}

	public void addLabel(String messageId, String labelId) {
		String payload = toJson(Map.of("addLabelIds", List.of(labelId)));
		HttpRequest request = authorizedRequest(MAILBOX_URL + "/messages/" + messageId + "/modify")
			.header("Content-Type", "application/json")
			.POST(HttpRequest.BodyPublishers.ofString(payload))
			.build();
		send(request);
	}

	private JsonNode getJson(String url) {
		return send(authorizedRequest(url).GET().build());
	}

	private HttpRequest.Builder authorizedRequest(String url) {
		return HttpRequest.newBuilder()
			.uri(URI.create(url))
			.timeout(REQUEST_TIMEOUT)
			.header("Authorization", "Bearer " + currentAccessToken());
	}

	private synchronized String currentAccessToken() {
		if (accessToken != null && Instant.now().isBefore(accessTokenExpiresAt.minus(TOKEN_EXPIRY_MARGIN))) {
			return accessToken;
		}
		JsonNode token = send(tokenRequest());
		accessToken = token.path("access_token").asText();
		accessTokenExpiresAt = Instant.now().plusSeconds(token.path("expires_in").asLong());
		return accessToken;
	}

	private HttpRequest tokenRequest() {
		Map<String, String> form = Map.of(
			"client_id", config.clientId().orElseThrow(),
			"client_secret", config.clientSecret().orElseThrow(),
			"refresh_token", config.refreshToken().orElseThrow(),
			"grant_type", "refresh_token"
		);
		String body = form.entrySet().stream()
			.map(field -> field.getKey() + "=" + encode(field.getValue()))
			.collect(Collectors.joining("&"));
		return HttpRequest.newBuilder()
			.uri(URI.create(TOKEN_URL))
			.timeout(REQUEST_TIMEOUT)
			.header("Content-Type", "application/x-www-form-urlencoded")
			.POST(HttpRequest.BodyPublishers.ofString(body))
			.build();
	}

	private JsonNode send(HttpRequest request) {
		try {
			HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
			boolean isSuccess = response.statusCode() >= 200 && response.statusCode() < 300;
			if (!isSuccess) {
				throw new IllegalStateException("Google answered HTTP " + response.statusCode() + ": " + truncated(response.body()));
			}
			return response.body().isBlank() ? objectMapper.createObjectNode() : objectMapper.readTree(response.body());
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			throw new IllegalStateException("Request to Google was interrupted", e);
		} catch (IOException e) {
			throw new IllegalStateException("Request to Google failed: " + e.getMessage(), e);
		}
	}

	private String toJson(Object value) {
		try {
			return objectMapper.writeValueAsString(value);
		} catch (IOException e) {
			throw new IllegalStateException("Request body could not be serialized", e);
		}
	}

	private static String truncated(String body) {
		return body.length() > ERROR_BODY_MAX_LENGTH ? body.substring(0, ERROR_BODY_MAX_LENGTH) : body;
	}

	private static String encode(String value) {
		return URLEncoder.encode(value, StandardCharsets.UTF_8);
	}

	private static boolean isPresent(Optional<String> value) {
		return value.filter(text -> !text.isBlank()).isPresent();
	}
}
