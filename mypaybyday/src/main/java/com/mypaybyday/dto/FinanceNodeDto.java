package com.mypaybyday.dto;

import com.mypaybyday.entity.FinanceNode;
import com.mypaybyday.enums.FinanceNodeType;

public record FinanceNodeDto(
        Long id,
        String name,
        FinanceNodeType type,
        boolean archived
) {
    public static FinanceNodeDto from(FinanceNode node) {
        return new FinanceNodeDto(node.id, node.name, node.type, node.archived);
    }

    public FinanceNode to() {
        FinanceNode node = new FinanceNode();
        node.id = this.id;
        node.name = this.name;
        node.type = this.type;
        node.archived = this.archived;
        return node;
    }
}
