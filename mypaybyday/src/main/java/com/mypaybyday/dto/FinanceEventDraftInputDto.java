package com.mypaybyday.dto;

import java.time.LocalDateTime;
import java.util.List;

import com.mypaybyday.enums.EventType;

/**
 * Input DTO for creating or patching a Finance Event Draft.
 * The transaction is always expressed as an explicit list of signed line items;
 * any "simplified mode" (single amount with an origin and a destination node) is a
 * frontend-only affordance that is expanded into line items before reaching the backend.
 */
public record FinanceEventDraftInputDto(
	Long id,
	String name,
	String description,
	EventType type,
	LocalDateTime transactionDate,
	Long categoryId,
	List<Long> tagIds,
	List<FinanceLineItemDto> lineItems
) {}
