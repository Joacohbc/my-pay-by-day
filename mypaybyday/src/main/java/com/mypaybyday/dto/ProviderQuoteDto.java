package com.mypaybyday.dto;

import java.math.BigDecimal;

/**
 * A quote as the external source offers it right now, before anything is recorded.
 *
 * @param source       name of the source the quote comes from
 * @param currency     ISO 4217 code being quoted
 * @param baseCurrency the currency the quote is expressed against
 * @param unitsPerBase how many units of {@code currency} buy one unit of {@code baseCurrency}
 */
public record ProviderQuoteDto(String source, String currency, String baseCurrency, BigDecimal unitsPerBase) {
}
