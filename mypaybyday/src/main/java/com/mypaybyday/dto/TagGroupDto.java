package com.mypaybyday.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.mypaybyday.entity.TagGroupEntity;

public record TagGroupDto(
		Long id,
		String name,
		String description,
		String icon,
		boolean archived,
		List<TagDto> tags,
		@JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
		List<Long> tagIds
) {
	public static TagGroupDto from(TagGroupEntity entity) {
		return new TagGroupDto(
				entity.id,
				entity.name,
				entity.description,
				entity.icon,
				entity.archived,
				entity.tags == null ? List.of() : entity.tags.stream().map(TagDto::from).toList(),
				null
		);
	}
}
