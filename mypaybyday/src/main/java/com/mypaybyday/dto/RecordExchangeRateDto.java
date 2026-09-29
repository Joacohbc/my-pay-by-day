package com.mypaybyday.dto;

import java.math.BigDecimal;

/**
 * A manually entered quote.
 *
 * @param currency     ISO 4217 code being quoted
 * @param unitsPerBase how many units of {@code currency} buy one unit of the base currency
 */
public record RecordExchangeRateDto(String currency, BigDecimal unitsPerBase) {
}
