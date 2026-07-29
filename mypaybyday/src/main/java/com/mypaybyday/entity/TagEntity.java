package com.mypaybyday.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.validation.constraints.NotBlank;

import com.mypaybyday.validation.RegexValidator;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity(name = "Tag")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TagEntity extends BaseEntity {

	@NotBlank
	public String name;

	public String description;

	@Column(length = RegexValidator.COLOR_MAX_LENGTH)
	public String color;

	@Builder.Default
	public boolean archived = false;
}
