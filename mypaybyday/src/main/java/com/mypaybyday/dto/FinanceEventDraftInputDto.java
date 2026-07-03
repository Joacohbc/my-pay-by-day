package com.mypaybyday.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.mypaybyday.enums.EventType;

/**
 * Input DTO for creating or patching a Finance Event Draft.
 * Supports both "simplified mode" (flat amount with source and dest nodes)
 * and "advanced mode" (explicit list of line items).
 */
public record FinanceEventDraftInputDto(
	Long id,
	String name,
	String description,
	EventType type,
	LocalDateTime transactionDate,
	Long categoryId,
	List<Long> tagIds,
	
	// Simplified Mode fields
	Boolean isSimplifiedMode,
	BigDecimal amount,
	Long sourceNodeId,
	Long destNodeId,

	// Advanced Mode fields
	List<FinanceLineItemDto> lineItems
) {}
