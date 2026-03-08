package com.mypaybyday.i18n;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.text.MessageFormat;
import java.util.Arrays;
import java.util.Locale;
import java.util.MissingResourceException;
import java.util.ResourceBundle;

/**
 * Resolves i18n message keys to localized strings using the language stored in
 * {@link LanguageContext}. Resource bundles are loaded from
 * {@code src/main/resources/i18n/messages_<lang>.properties}.
 */
@ApplicationScoped
public class Messages {

    @Inject
    LanguageContext languageContext;

    /**
     * Returns the localized message for {@code key}, applying any {@code args}
     * via {@link MessageFormat#format}.
     * Falls back to the key itself if the bundle or key is missing.
     */
    public String get(MsgKey key, Object... args) {
        String lang = languageContext.getLang();
        try {
            ResourceBundle bundle = ResourceBundle.getBundle("i18n/messages", new Locale(lang));
            String pattern = bundle.getString(key.key);
            return args.length > 0 ? MessageFormat.format(pattern, args) : pattern;
        } catch (MissingResourceException e) {
            // Fallback: return the key so callers always get a non-null string
            return args.length > 0 ? key.key + " " + Arrays.toString(args) : key.key;
        }
    }
}
