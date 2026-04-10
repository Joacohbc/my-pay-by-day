package com.mypaybyday.dto;

import com.mypaybyday.entity.TagEntity;

public record TagDto(
        Long id,
        String name,
        String description
) {
    public static TagDto from(TagEntity tag) {
        return new TagDto(tag.id, tag.name, tag.description);
    }

    public TagEntity to() {
        TagEntity t = new TagEntity();
        t.id = this.id;
        t.name = this.name;
        t.description = this.description;
        return t;
    }
}
