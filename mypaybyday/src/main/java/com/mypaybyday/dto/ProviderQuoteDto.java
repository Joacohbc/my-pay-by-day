package com.mypaybyday.dto;

import java.math.BigDecimal;

import com.mypaybyday.enums.QuotedPrice;

/**
 * A quote as the external source offers it right now, before anything is recorded.
 *
 * @param source       name of the source the quote comes from
 * @param quotedPrice  which of the source's prices the quote is: buying, selling or their midpoint
 * @param currency     ISO 4217 code being quoted
 * @param baseCurrency the currency the quote is expressed against
 * @param unitsPerBase how many units of {@code currency} buy one unit of {@code baseCurrency}
 */
public record ProviderQuoteDto(String source, QuotedPrice quotedPrice, String currency, String baseCurrency, BigDecimal unitsPerBase) {
}
