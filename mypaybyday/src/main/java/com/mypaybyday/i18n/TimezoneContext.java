package com.mypaybyday.i18n;

import org.eclipse.microprofile.config.inject.ConfigProperty;
import jakarta.enterprise.context.RequestScoped;

@RequestScoped
public class TimezoneContext {

	@ConfigProperty(name = "mypaybyday.timezone")
	String timezone;

	public String getTimezone() {
		return timezone;
	}

	public void setTimezone(String timezone) {
		this.timezone = timezone;
	}
}
