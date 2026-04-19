package com.mypaybyday.entity;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.HashSet;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.validation.constraints.NotBlank;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity(name = "TagGroup")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TagGroupEntity extends BaseEntity {

	@NotBlank
	public String name;

	public String description;

	public String icon;

	@Builder.Default
	public boolean archived = false;

	@ManyToMany(fetch = FetchType.LAZY)
	@JoinTable(
			name = "tag_group_tag",
			joinColumns = @JoinColumn(name = "tag_group_id"),
			inverseJoinColumns = @JoinColumn(name = "tag_id")
	)
	@Builder.Default
	public Set<TagEntity> tags = new HashSet<>();
}
