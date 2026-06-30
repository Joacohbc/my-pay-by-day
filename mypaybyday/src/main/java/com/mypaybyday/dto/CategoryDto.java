package com.mypaybyday.dto;

import com.mypaybyday.entity.CategoryEntity;

public record CategoryDto(
		Long id,
		String name,
		String description,
		String icon,
		String color,
		boolean archived
) {

	public static CategoryDto from(CategoryEntity category) {
		return new CategoryDto(category.id, category.name, category.description, category.icon, category.color, category.archived);
	}


	public CategoryEntity to() {
		CategoryEntity c = new CategoryEntity();
		c.id = this.id;
		c.name = this.name;
		c.description = this.description;
		c.icon = this.icon;
		c.color = this.color;
		return c;
	}
}
