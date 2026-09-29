package com.mypaybyday.dto;

/**
 * A currency as carried in an export archive.
 */
public record CurrencyExportDto(String code, boolean principal) {
}
