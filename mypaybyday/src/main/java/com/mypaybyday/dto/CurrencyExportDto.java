package com.mypaybyday.dto;

/**
 * A currency as carried in an export archive.
 *
 * @param base whether it was the base currency; archives from before the base was a choice omit it
 */
public record CurrencyExportDto(String code, boolean principal, boolean base) {
}
