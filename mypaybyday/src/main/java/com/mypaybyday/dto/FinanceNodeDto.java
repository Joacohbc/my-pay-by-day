package com.mypaybyday.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import com.mypaybyday.entity.FinanceNodeEntity;
import com.mypaybyday.enums.FinanceNodeType;

public record FinanceNodeDto(
		Long id,
		String name,
		FinanceNodeType type,
		String description,
		String icon,
		String color,
		boolean archived,
		@Schema(nullable = true, description = "ISO 4217 code this node is denominated in; null when it holds no particular currency")
		String currency
) {

	public static FinanceNodeDto from(FinanceNodeEntity node) {
		return new FinanceNodeDto(node.id, node.name, node.type, node.description, node.icon, node.color, node.archived,
				node.currency);
	}


	public FinanceNodeEntity to() {
		FinanceNodeEntity node = new FinanceNodeEntity();
		node.id = this.id;
		node.name = this.name;
		node.type = this.type;
		node.description = this.description;
		node.icon = this.icon;
		node.color = this.color;
		node.archived = this.archived;
		node.currency = this.currency;
		return node;
	}
}
