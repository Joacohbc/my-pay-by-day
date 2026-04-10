package com.mypaybyday.dto;

import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.enums.EventType;

/**
 * Minimal event projection used to show which events are linked to a file.
 */
public record EventSummaryDto(Long id, String name, EventType type) {
	public static EventSummaryDto from(FinanceEventEntity event) {
		return new EventSummaryDto(event.id, event.name, event.type);
	}
}
