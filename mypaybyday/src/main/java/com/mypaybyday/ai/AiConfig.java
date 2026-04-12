package com.mypaybyday.ai;

import java.time.Duration;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Produces;
import jakarta.inject.Named;

import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Manually wires LangChain4j models as CDI beans.
 * Two independent ChatModel instances allow using different models
 * for chat/tools (primary) and image analysis (vision).
 */
@ApplicationScoped
public class AiConfig {

	@ConfigProperty(name = "ai.primary.base-url")
	String primaryBaseUrl;

	@ConfigProperty(name = "ai.primary.api-key")
	String primaryApiKey;

	@ConfigProperty(name = "ai.primary.model-name")
	String primaryModelName;

	@ConfigProperty(name = "ai.primary.timeout", defaultValue = "120")
	long primaryTimeout;

	@ConfigProperty(name = "ai.vision.base-url")
	String visionBaseUrl;

	@ConfigProperty(name = "ai.vision.api-key")
	String visionApiKey;

	@ConfigProperty(name = "ai.vision.model-name")
	String visionModelName;

	@ConfigProperty(name = "ai.vision.timeout", defaultValue = "120")
	long visionTimeout;

	@Produces
	@ApplicationScoped
	@Named("primaryChatModel")
	public ChatModel primaryChatModel() {
		return OpenAiChatModel.builder()
				.baseUrl(primaryBaseUrl)
				.apiKey(primaryApiKey)
				.modelName(primaryModelName)
				.timeout(Duration.ofSeconds(primaryTimeout))
				.logRequests(false)
				.logResponses(false)
				.build();
	}

	@Produces
	@ApplicationScoped
	@Named("visionChatModel")
	public ChatModel visionChatModel() {
		return OpenAiChatModel.builder()
				.baseUrl(visionBaseUrl)
				.apiKey(visionApiKey)
				.modelName(visionModelName)
				.timeout(Duration.ofSeconds(visionTimeout))
				.logRequests(false)
				.logResponses(false)
				.build();
	}

}
