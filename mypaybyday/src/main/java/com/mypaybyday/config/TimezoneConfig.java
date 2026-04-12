package com.mypaybyday.config;

import java.util.TimeZone;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;

import io.quarkus.runtime.StartupEvent;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

@ApplicationScoped
public class TimezoneConfig {

	private static final Logger LOG = Logger.getLogger(TimezoneConfig.class);

	@ConfigProperty(name = "mypaybyday.timezone")
	String timezone;

	void onStart(@Observes StartupEvent ev) {
		LOG.info("Setting default TimeZone to " + timezone);
		TimeZone.setDefault(TimeZone.getTimeZone(timezone));
	}
}
