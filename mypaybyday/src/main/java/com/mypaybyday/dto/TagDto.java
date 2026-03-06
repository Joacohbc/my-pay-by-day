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
}
