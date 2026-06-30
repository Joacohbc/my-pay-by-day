package com.mypaybyday.entity;

import jakarta.persistence.Entity;
import jakarta.validation.constraints.NotBlank;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity(name = "Category")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryEntity extends BaseEntity {

	@NotBlank
	public String name;

	public String description;

	public String icon;

	/** Palette key for the icon color (e.g. "blue", "rose"). Null = default tint. */
	public String color;

	@Builder.Default
	public boolean archived = false;

}
