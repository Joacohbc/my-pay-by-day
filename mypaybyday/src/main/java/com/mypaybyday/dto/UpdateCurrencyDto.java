package com.mypaybyday.dto;

/**
 * @param principal whether every transaction is converted into this currency
 */
public record UpdateCurrencyDto(boolean principal) {
}
