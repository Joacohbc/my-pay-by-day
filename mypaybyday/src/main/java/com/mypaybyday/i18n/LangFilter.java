package com.mypaybyday.i18n;

import jakarta.inject.Inject;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.ext.Provider;

import java.util.Set;

/**
 * JAX-RS filter that reads the {@code ?lang=} query parameter from every request
 * and stores the resolved language in {@link LanguageContext}.
 * <p>
 * Supported values: {@code en} (default), {@code es}.
 * Any unsupported or missing value falls back to English.
 */
@Provider
public class LangFilter implements ContainerRequestFilter {

    private static final Set<String> SUPPORTED = Set.of("en", "es");

    @Inject
    LanguageContext languageContext;

    @Override
    public void filter(ContainerRequestContext requestContext) {
        String lang = requestContext.getUriInfo().getQueryParameters().getFirst("lang");
        if (lang != null && SUPPORTED.contains(lang.toLowerCase())) {
            languageContext.setLang(lang.toLowerCase());
        }
    }
}
