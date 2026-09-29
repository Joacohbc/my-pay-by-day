package com.mypaybyday.validation;

import java.util.Currency;
import java.util.Locale;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;

/**
 * Validates ISO 4217 currency codes and the pairing between an amount and the code that
 * denominates it.
 *
 * <p>Membership is checked against {@link Currency}, the JDK's own ISO 4217 registry, rather
 * than a hand-maintained list that would drift as currencies are introduced or withdrawn.
 */
@ApplicationScoped
public class CurrencyValidator {

	public static final int CODE_LENGTH = 3;

	private final Messages messages;

	public CurrencyValidator(Messages messages) {
		this.messages = messages;
	}

	/**
	 * Normalises a code to the upper-case form the rest of the system compares against.
	 *
	 * @return the normalised code, or {@code null} when nothing was supplied
	 */
	public String normalize(String code) {
		if (code == null) return null;
		String trimmed = code.trim();
		return trimmed.isEmpty() ? null : trimmed.toUpperCase(Locale.ROOT);
	}

	/**
	 * @throws BusinessException if the code is missing or is not a known ISO 4217 currency
	 */
	public String validateRequired(String code) throws BusinessException {
		String normalized = normalize(code);
		if (normalized == null) {
			throw messages.reject(MsgKey.CURRENCY_REQUIRED);
		}
		return validateSupported(normalized);
	}

	/**
	 * @return the normalised code, or {@code null} when nothing was supplied
	 * @throws BusinessException if a code was supplied but is not a known ISO 4217 currency
	 */
	public String validateOptional(String code) throws BusinessException {
		String normalized = normalize(code);
		return normalized == null ? null : validateSupported(normalized);
	}

	private String validateSupported(String normalized) throws BusinessException {
		if (normalized.length() != CODE_LENGTH) {
			throw messages.reject(MsgKey.CURRENCY_INVALID, normalized);
		}
		try {
			Currency.getInstance(normalized);
		} catch (IllegalArgumentException unknownCode) {
			throw messages.reject(MsgKey.CURRENCY_INVALID, normalized);
		}
		return normalized;
	}
}
