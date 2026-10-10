package com.mypaybyday.service.currency;

import java.math.BigDecimal;

import com.mypaybyday.enums.QuotedPrice;

/**
 * A quote as one provider offers it right now.
 *
 * @param unitsPerBase units of {@code currency} that buy one unit of the base currency
 */
public record ProviderQuote(String providerName, QuotedPrice quotedPrice, String currency, BigDecimal unitsPerBase) {
}
