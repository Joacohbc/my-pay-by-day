package com.mypaybyday.ai;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Map;

import jakarta.enterprise.context.ApplicationScoped;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

@ApplicationScoped
public class AudioTranscriptionService {

	private static final Logger log = Logger.getLogger(AudioTranscriptionService.class);

	private static final String TRANSCRIPTION_PROMPT =
			"Transcribe this audio exactly as spoken. " +
			"Return only the transcription text — no explanations, no formatting, no extra words.";

	@ConfigProperty(name = "ai.audio.base-url")
	String baseUrl;

	@ConfigProperty(name = "ai.audio.api-key")
	String apiKey;

	@ConfigProperty(name = "ai.audio.model-name")
	String audioModelName;

	@ConfigProperty(name = "ai.audio.timeout", defaultValue = "60")
	long audioTimeout;

	private final HttpClient httpClient = HttpClient.newHttpClient();
	private final ObjectMapper objectMapper = new ObjectMapper();

	public String transcribeAudio(byte[] audioBytes, String mimeType) {
		String resolvedMimeType = resolveBaseMimeType(mimeType);
		if (!isWavMimeType(resolvedMimeType)) {
			throw new RuntimeException("Only WAV audio is supported");
		}

		String audioFormat = "wav";
		String base64Data = Base64.getEncoder().encodeToString(audioBytes);

		log.infof("Transcribing audio [model=%s, mimeType=%s, bytes=%d]", audioModelName, resolvedMimeType, audioBytes.length);

		try {
			Map<String, Object> body = Map.of(
					"model", audioModelName,
					"messages", List.of(
							Map.of(
									"role", "user",
									"content", List.of(
											Map.of("type", "text", "text", TRANSCRIPTION_PROMPT),
											Map.of(
													"type", "input_audio",
													"input_audio", Map.of(
															"data", base64Data,
															"format", audioFormat
													)
											)
									)
							)
					)
			);

			String requestJson = objectMapper.writeValueAsString(body);

			HttpRequest request = HttpRequest.newBuilder()
					.uri(URI.create(baseUrl + "/chat/completions"))
					.header("Content-Type", "application/json")
					.header("Authorization", "Bearer " + apiKey)
					.POST(HttpRequest.BodyPublishers.ofString(requestJson))
					.timeout(Duration.ofSeconds(audioTimeout))
					.build();

			HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

			if (response.statusCode() != 200) {
				log.errorf("Audio transcription error [status=%d, body=%s]", response.statusCode(), response.body());
				throw new RuntimeException("Audio transcription failed with status " + response.statusCode() + ": " + response.body());
			}

			return parseTranscription(response.body());

		} catch (RuntimeException e) {
			throw e;
		} catch (Exception e) {
			throw new RuntimeException("Audio transcription request failed: " + e.getMessage(), e);
		}
	}

	private String resolveBaseMimeType(String mimeType) {
		if (mimeType == null || mimeType.isBlank()) return "";
		int semicolonIndex = mimeType.indexOf(';');
		String resolvedMimeType = semicolonIndex > 0 ? mimeType.substring(0, semicolonIndex).trim() : mimeType.trim();
		return resolvedMimeType.toLowerCase();
	}

	private boolean isWavMimeType(String mimeType) {
		return "audio/wav".equals(mimeType)
				|| "audio/x-wav".equals(mimeType)
				|| "audio/wave".equals(mimeType);
	}

	private String parseTranscription(String responseJson) throws Exception {
		JsonNode root = objectMapper.readTree(responseJson);
		JsonNode choices = root.path("choices");
		if (choices.isEmpty()) {
			throw new RuntimeException("No choices in audio model response");
		}
		String transcription = choices.get(0).path("message").path("content").asText();
		if (transcription == null || transcription.isBlank()) {
			throw new RuntimeException("Empty transcription in model response");
		}
		return transcription.trim();
	}
}
