package com.mypaybyday.i18n;

import java.text.MessageFormat;
import java.util.Arrays;
import java.util.Locale;
import java.util.MissingResourceException;
import java.util.ResourceBundle;

import com.mypaybyday.exception.BusinessException;

import jakarta.enterprise.context.ApplicationScoped;

/**
 * Resolves i18n message keys to localized strings using the language stored in
 * {@link LanguageContext}. Resource bundles are loaded from
 * {@code src/main/resources/i18n/messages_<lang>.properties}.
 */
@ApplicationScoped
public class Messages {

	private final LanguageContext languageContext;

	public Messages(LanguageContext languageContext) {
		this.languageContext = languageContext;
	}

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

	/**
	 * Builds a {@link BusinessException} whose message is the localized text for {@code key} and whose
	 * {@link com.mypaybyday.enums.ErrorKind} is derived from {@code key}. Callers throw the result, so a
	 * message key is named exactly once at the throw site.
	 */
	public BusinessException reject(MsgKey key, Object... args) {
		return new BusinessException(key, get(key, args));
	}
}
