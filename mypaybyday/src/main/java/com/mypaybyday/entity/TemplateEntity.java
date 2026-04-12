package com.mypaybyday.entity;

import com.mypaybyday.enums.EventType;
import com.mypaybyday.enums.ModifierType;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity(name = "Template")
@Table(name = "Template")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TemplateEntity extends BaseEntity {

	@NotBlank
	public String name;

	public String description;

	@ManyToOne(fetch = FetchType.EAGER)
	@JoinColumn(name = "origin_node_id")
	public FinanceNodeEntity originNode;

	@ManyToOne(fetch = FetchType.EAGER)
	@JoinColumn(name = "destination_node_id")
	public FinanceNodeEntity destinationNode;

	@ManyToOne(fetch = FetchType.EAGER)
	@JoinColumn(name = "category_id")
	public CategoryEntity category;

	@ManyToMany(fetch = FetchType.EAGER)
	@JoinTable(name = "template_tag", joinColumns = @JoinColumn(name = "template_id"), inverseJoinColumns = @JoinColumn(name = "tag_id"))
	@Builder.Default
	public List<TagEntity> tags = new ArrayList<>();

	@Enumerated(EnumType.STRING)
	public EventType eventType;

	@Enumerated(EnumType.STRING)
	public ModifierType modifierType;

	public BigDecimal modifierValue;

}
