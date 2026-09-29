package com.mypaybyday.dto;

import java.math.BigDecimal;

/**
 * A single monetary value together with the ISO 4217 currency that denominates it.
 *
 * <p>The system holds no exchange rates, so an amount is never meaningful on its own: two
 * {@code MoneyDto}s of different currencies can be listed side by side but never added. Pairing
 * the two fields in one type is what stops a bare {@link BigDecimal} from travelling through the
 * API with its currency implied by convention.
 */
public record MoneyDto(BigDecimal amount, String currency) {

	public static MoneyDto of(BigDecimal amount, String currency) {
		return new MoneyDto(amount, currency);
	}
}
