package com.mypaybyday.dto;

import com.mypaybyday.entity.FinanceNodeEntity;
import com.mypaybyday.enums.FinanceNodeType;

public record FinanceNodeDto(
		Long id,
		String name,
		FinanceNodeType type,
		String description,
		String icon,
		String color,
		boolean archived
) {

	public static FinanceNodeDto from(FinanceNodeEntity node) {
		return new FinanceNodeDto(node.id, node.name, node.type, node.description, node.icon, node.color, node.archived);
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
		return node;
	}
}
