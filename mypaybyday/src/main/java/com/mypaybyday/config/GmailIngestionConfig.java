package com.mypaybyday.config;

import java.util.List;
import java.util.Optional;

import io.smallrye.config.ConfigMapping;
import io.smallrye.config.WithDefault;

@ConfigMapping(prefix = "mypaybyday.gmail")
public interface GmailIngestionConfig {

	String pollInterval();

	Optional<String> clientId();

	Optional<String> clientSecret();

	Optional<String> refreshToken();

	Optional<List<String>> sourceLabels();

	@WithDefault("Pagos - Enviado")
	String processedLabel();

	Optional<String> baselineDate();

	@WithDefault("20")
	int maxMessagesPerLabel();

	String timezone();

	String language();

	String currency();
}
