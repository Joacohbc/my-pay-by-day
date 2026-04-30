package com.mypaybyday.i18n;

import java.util.TimeZone;

import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.ext.Provider;

/**
 * JAX-RS filter that reads the timezone from the {@code X-Timezone} header
 * or the {@code ?tz=} query parameter and stores it in {@link TimezoneContext}.
 * <p>
 * Defaults to the system default if not provided or invalid.
 */
@Provider
public class TimezoneFilter implements ContainerRequestFilter {

	private final TimezoneContext timezoneContext;

	public TimezoneFilter(TimezoneContext timezoneContext) {
		this.timezoneContext = timezoneContext;
	}

	@Override
	public void filter(ContainerRequestContext requestContext) {
		String tz = requestContext.getHeaderString("X-Timezone");
		if (tz == null || tz.isBlank()) {
			tz = requestContext.getUriInfo().getQueryParameters().getFirst("tz");
		}

		if (tz != null && !tz.isBlank()) {
			try {
				// Validate timezone ID
				TimeZone timeZone = TimeZone.getTimeZone(tz);
				// TimeZone.getTimeZone returns GMT if the ID is not recognized, 
				// but it's better than nothing.
				timezoneContext.setTimezone(timeZone.getID());
			} catch (Exception e) {
				// Fallback to default
			}
		}
	}
}
