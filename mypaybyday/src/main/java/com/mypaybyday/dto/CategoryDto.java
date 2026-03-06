package com.mypaybyday.dto;

import com.mypaybyday.entity.Category;

public record CategoryDto(
        Long id,
        String name,
        String description
) {
    public static CategoryDto from(Category category) {
        return new CategoryDto(category.id, category.name, category.description);
    }
}
