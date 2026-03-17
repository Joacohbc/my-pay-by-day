package com.mypaybyday.dto;

import com.mypaybyday.entity.Category;

public record CategoryDto(
        Long id,
        String name,
        String description,
        String icon
) {
    public static CategoryDto from(Category category) {
        return new CategoryDto(category.id, category.name, category.description, category.icon);
    }

    public Category to() {
        Category c = new Category();
        c.id = this.id;
        c.name = this.name;
        c.description = this.description;
        c.icon = this.icon;
        return c;
    }
}
