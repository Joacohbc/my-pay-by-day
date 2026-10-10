package com.mypaybyday.service.event;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import com.mypaybyday.dto.FileDto;
import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.FinanceLineItemDto;
import com.mypaybyday.entity.CategoryEntity;
import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.entity.FinanceLineItemEntity;
import com.mypaybyday.entity.FinanceNodeEntity;
import com.mypaybyday.entity.FinanceTransactionEntity;
import com.mypaybyday.entity.TagEntity;
import com.mypaybyday.enums.EventType;

/**
 * Builds an unsaved {@link FinanceEventEntity} from a {@link FinanceEventDto} whose references
 * (category, tags, nodes) carry only ids. The result is what {@link EventCreateService#create}
 * resolves and persists, and what the transaction rules can be checked against without persisting.
 */
public final class TransientFinanceEvent {

	private TransientFinanceEvent() {
	}

	public static FinanceEventEntity from(FinanceEventDto dto) {
		FinanceEventEntity event = new FinanceEventEntity();
		event.name = dto.name();
		event.description = dto.description();
		event.type = dto.type() != null ? dto.type() : EventType.OUTBOUND;
		event.category = categoryReference(dto);
		event.tags = tagReferences(dto);
		if (dto.files() != null) {
			event.fileIds = dto.files().stream().map(FileDto::id).toList();
		}

		FinanceTransactionEntity transaction = new FinanceTransactionEntity();
		transaction.transactionDate = dto.transactionDate();
		transaction.lineItems = lineItemsOf(dto.lineItems(), transaction);
		event.transaction = transaction;
		return event;
	}

	private static CategoryEntity categoryReference(FinanceEventDto dto) {
		if (dto.category() == null || dto.category().id() == null) {
			return null;
		}
		CategoryEntity category = new CategoryEntity();
		category.id = dto.category().id();
		return category;
	}

	private static Set<TagEntity> tagReferences(FinanceEventDto dto) {
		if (dto.tags() == null) {
			return new HashSet<>();
		}
		return dto.tags().stream()
				.filter(tag -> tag.id() != null)
				.map(tag -> {
					TagEntity reference = new TagEntity();
					reference.id = tag.id();
					return reference;
				})
				.collect(Collectors.toSet());
	}

	private static Set<FinanceLineItemEntity> lineItemsOf(List<FinanceLineItemDto> lineItems,
			FinanceTransactionEntity transaction) {
		Set<FinanceLineItemEntity> items = new HashSet<>();
		if (lineItems == null) {
			return items;
		}
		for (FinanceLineItemDto lineItem : lineItems) {
			FinanceLineItemEntity item = new FinanceLineItemEntity();
			item.setAmount(lineItem.amount());
			item.currency = lineItem.currency();
			item.financeNode = nodeReference(lineItem.financeNodeId());
			item.transaction = transaction;
			items.add(item);
		}
		return items;
	}

	private static FinanceNodeEntity nodeReference(Long nodeId) {
		if (nodeId == null) {
			return null;
		}
		FinanceNodeEntity node = new FinanceNodeEntity();
		node.id = nodeId;
		return node;
	}
}
