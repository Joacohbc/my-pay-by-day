package com.mypaybyday.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;

import jakarta.enterprise.context.ApplicationScoped;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.logging.Log;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * HTTP client for the MarkItDown sidecar, which converts document files (PDF, DOCX, XLSX, ...)
 * to Markdown text. Conversion is best-effort: any transport error, non-200 response, or a
 * disabled sidecar yields an empty result so callers can persist files without Markdown and
 * retry later.
 */
@ApplicationScoped
public class MarkItDownClient {

	private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);

	private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(30);

	private static final String[] NON_CONVERTIBLE_MIME_PREFIXES = { "image/", "audio/", "video/" };

	private final ObjectMapper objectMapper;

	private final Optional<String> sidecarUrl;

	private final HttpClient httpClient;

	public MarkItDownClient(ObjectMapper objectMapper,
			@ConfigProperty(name = "mypaybyday.markitdown.url") Optional<String> sidecarUrl) {
		this.objectMapper = objectMapper;
		this.sidecarUrl = sidecarUrl.filter(url -> !url.isBlank());
		this.httpClient = HttpClient.newBuilder().connectTimeout(CONNECT_TIMEOUT).build();
	}

	/**
	 * Determines whether a file of the given MIME type can be converted to Markdown.
	 * Media files (image, audio, video) are excluded; every document type — including PDF —
	 * is considered convertible.
	 *
	 * @param mimeType the full MIME type of the file
	 * @return {@code true} when the file is a document the sidecar can convert
	 */
	public boolean isConvertible(String mimeType) {
		if (mimeType == null || mimeType.isBlank()) {
			return false;
		}
		for (String prefix : NON_CONVERTIBLE_MIME_PREFIXES) {
			if (mimeType.startsWith(prefix)) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Converts a file to Markdown through the sidecar.
	 *
	 * @param data     the raw file bytes
	 * @param mimeType the full MIME type of the file
	 * @param fileName the original file name, used by the sidecar to infer the format
	 * @return the Markdown text, or empty when the sidecar is disabled, unreachable, or fails
	 */
	public Optional<String> convert(byte[] data, String mimeType, String fileName) {
		if (sidecarUrl.isEmpty()) {
			return Optional.empty();
		}
		try {
			HttpRequest request = buildConvertRequest(data, mimeType, fileName);
			HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
			if (response.statusCode() != 200) {
				Log.warnf("MarkItDown conversion failed for '%s': HTTP %d", fileName, response.statusCode());
				return Optional.empty();
			}
			JsonNode body = objectMapper.readTree(response.body());
			String markdown = body.path("markdown").asText(null);
			return Optional.ofNullable(markdown);
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			Log.warnf("MarkItDown conversion interrupted for '%s'", fileName);
			return Optional.empty();
		} catch (Exception e) {
			Log.warnf("MarkItDown conversion failed for '%s': %s", fileName, e.getMessage());
			return Optional.empty();
		}
	}

	private HttpRequest buildConvertRequest(byte[] data, String mimeType, String fileName) throws Exception {
		String payload = objectMapper.writeValueAsString(Map.of(
			"data", Base64.getEncoder().encodeToString(data),
			"mediaType", mimeType == null ? "" : mimeType,
			"filename", fileName == null ? "" : fileName
		));
		return HttpRequest.newBuilder()
			.uri(URI.create(sidecarUrl.orElseThrow() + "/convert"))
			.timeout(REQUEST_TIMEOUT)
			.header("Content-Type", "application/json")
			.POST(HttpRequest.BodyPublishers.ofString(payload))
			.build();
	}
}
