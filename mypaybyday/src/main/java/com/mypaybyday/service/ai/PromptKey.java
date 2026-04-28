package com.mypaybyday.service.ai;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

// TODO: Change the naming of these keys to be more consistent and clear about their purpose
public enum PromptKey {
    EXTRACTION_TEMPLATE("prompts/event-extraction-template.txt"),
	SYSTEM_AGENT("prompts/system-prompt-agent.txt"),
	SYSTEM_CHAT("prompts/system-prompt-chat.txt"),
	SYSTEM_EVENT_DESCRIPTION("prompts/system-prompt-event-description.txt"),
	SYSTEM_EXTRACTION("prompts/system-prompt-extraction.txt"),
	SYSTEM_IMAGES("prompts/system-prompt-images.txt"),
	SYSTEM_AUDIO("prompts/system-prompt-audio.txt");

	private final String path;
	private final String content;

	PromptKey(String path) {
		this.path = path;
		this.content = load(path);
	}

	public String getPath() {
		return path;
	}

	public String getContent() {
		return content;
	}

	private static String load(String resourcePath) {
		try (InputStream is = Thread.currentThread().getContextClassLoader().getResourceAsStream(resourcePath)) {
			if (is == null) {
				throw new IllegalStateException("Prompt resource not found: " + resourcePath);
			}
			return new String(is.readAllBytes(), StandardCharsets.UTF_8);
		} catch (IOException e) {
			throw new IllegalStateException("Failed to load prompt resource: " + resourcePath, e);
		}
	}
}
