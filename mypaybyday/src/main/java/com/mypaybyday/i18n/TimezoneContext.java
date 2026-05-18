package com.mypaybyday.i18n;

import org.eclipse.microprofile.config.inject.ConfigProperty;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.RequestScoped;

@RequestScoped
public class TimezoneContext {

	@ConfigProperty(name = "mypaybyday.timezone")
	String configuredTimezone;

	// Two fields with same initial value: defaultTimezone is an immutable snapshot
	// of the config used as fallback (e.g. when an agent task has no explicit tz);
	// timezone is mutable per-request (set by TimezoneFilter from X-Timezone header).
	// Keeping them separate prevents setTimezone() from clobbering the default.
	private String defaultTimezone;
	private String timezone;

	@PostConstruct
	void init() {
		this.defaultTimezone = configuredTimezone;
		this.timezone = configuredTimezone;
	}

	public String getDefaultTimezone() {
		return defaultTimezone;
	}

	public String getTimezone() {
		return timezone;
	}

	public void setTimezone(String timezone) {
		this.timezone = timezone;
	}
}
