package com.mypaybyday.dto;

import com.mypaybyday.entity.TagEntity;

public record TagDto(
		Long id,
		String name,
		String description,
		String color,
		boolean archived
) {

	public static TagDto ofId(Long id) {
		return new TagDto(id, null, null, null, false);
	}

	public static TagDto from(TagEntity tag) {
		return new TagDto(tag.id, tag.name, tag.description, tag.color, tag.archived);
	}


	public TagEntity to() {
		TagEntity t = new TagEntity();
		t.id = this.id;
		t.name = this.name;
		t.description = this.description;
		t.color = this.color;
		return t;
	}
}
