package com.mypaybyday.dto;

import com.mypaybyday.entity.FinanceNodeEntity;
import com.mypaybyday.enums.FinanceNodeType;

public record FinanceNodeDto(
		Long id,
		String name,
		FinanceNodeType type,
		boolean archived
) {

	public static FinanceNodeDto from(FinanceNodeEntity node) {
		return new FinanceNodeDto(node.id, node.name, node.type, node.archived);
	}


	public FinanceNodeEntity to() {
		FinanceNodeEntity node = new FinanceNodeEntity();
		node.id = this.id;
		node.name = this.name;
		node.type = this.type;
		node.archived = this.archived;
		return node;
	}
}
