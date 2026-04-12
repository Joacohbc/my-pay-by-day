package com.mypaybyday.dto;

import java.math.BigDecimal;
import java.util.List;

import com.mypaybyday.entity.TemplateEntity;
import com.mypaybyday.enums.EventType;
import com.mypaybyday.enums.ModifierType;

public record TemplateDto(
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
	ModifierType modifierType,
	BigDecimal modifierValue) {

    public static TemplateDto from(TemplateEntity t) {
	return new TemplateDto(
		t.id,
		t.name,
		t.description,
		t.originNode != null ? t.originNode.id : null,
		t.originNode != null ? t.originNode.name : null,
		t.destinationNode != null ? t.destinationNode.id : null,
		t.destinationNode != null ? t.destinationNode.name : null,
		t.category != null ? CategoryDto.from(t.category) : null,
		t.tags != null ? t.tags.stream().map(TagDto::from).toList() : List.of(),
		t.eventType,
		t.modifierType,
		t.modifierValue);
    }
}
