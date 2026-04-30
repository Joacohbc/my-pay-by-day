package com.mypaybyday.i18n;

import java.util.Set;

import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.ext.Provider;

/**
 * JAX-RS filter that reads the {@code X-Language} header (or {@code ?lang=} query param as fallback)
 * and stores the resolved language in {@link LanguageContext}.
 * <p>
 * Supported values: {@code en} (default), {@code es}.
 * Any unsupported or missing value falls back to English.
 */
@Provider
public class LangFilter implements ContainerRequestFilter {

	private static final Set<String> SUPPORTED = Set.of("en", "es");

	private final LanguageContext languageContext;

	public LangFilter(LanguageContext languageContext) {
		this.languageContext = languageContext;
	}

	@Override
	public void filter(ContainerRequestContext requestContext) {
		String lang = requestContext.getHeaderString("X-Language");
		if (lang == null || lang.isBlank()) {
			lang = requestContext.getUriInfo().getQueryParameters().getFirst("lang");
		}
		if (lang != null && SUPPORTED.contains(lang.toLowerCase())) {
			languageContext.setLang(lang.toLowerCase());
		}
	}
}
