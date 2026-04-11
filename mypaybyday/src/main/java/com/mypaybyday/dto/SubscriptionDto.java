package com.mypaybyday.dto;

import com.mypaybyday.entity.SubscriptionEntity;
import com.mypaybyday.enums.EventType;
import com.mypaybyday.enums.RecurrenceFrequency;
import com.mypaybyday.enums.SubscriptionStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record SubscriptionDto(
	Long id,
	String name,
	String description,
	Long originNodeId,
	String originNodeName,
	Long destinationNodeId,
	String destinationNodeName,
	CategoryDto category,
	List<TagDto> tags,
	EventType eventType,
	BigDecimal modifierValue,
	RecurrenceFrequency recurrence,
	LocalDate nextExecutionDate,
	SubscriptionStatus status) {

    public static SubscriptionDto from(SubscriptionEntity s) {
	return new SubscriptionDto(
		s.id,
		s.name,
		s.description,
		s.originNode != null ? s.originNode.id : null,
		s.originNode != null ? s.originNode.name : null,
		s.destinationNode != null ? s.destinationNode.id : null,
		s.destinationNode != null ? s.destinationNode.name : null,
		s.category != null ? CategoryDto.from(s.category) : null,
		s.tags.stream().map(TagDto::from).toList(),
		s.eventType,
		s.modifierValue,
		s.recurrence,
		s.nextExecutionDate,
		s.status);
    }
}
