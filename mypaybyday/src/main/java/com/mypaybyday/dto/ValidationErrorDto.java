package com.mypaybyday.dto;

/**
 * A single validation failure found while dry-run validating a draft.
 *
 * @param field   which part of the draft failed — one of "name", "transactionDate", "lineItems",
 *                "lineItems.zeroSum" or "lineItems.nodes"
 * @param message localized, human-readable description of the failure
 */
public record ValidationErrorDto(String field, String message) {}
