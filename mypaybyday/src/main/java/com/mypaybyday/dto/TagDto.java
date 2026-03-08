package com.mypaybyday.dto;

import com.mypaybyday.entity.Tag;

public record TagDto(
        Long id,
        String name,
        String description
) {
    public static TagDto from(Tag tag) {
        return new TagDto(tag.id, tag.name, tag.description);
    }

    public Tag to() {
        Tag t = new Tag();
        t.id = this.id;
        t.name = this.name;
        t.description = this.description;
        return t;
    }
}
