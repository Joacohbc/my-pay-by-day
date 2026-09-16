package com.mypaybyday.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import com.mypaybyday.entity.FinanceLineItemEntity;

public record FinanceLineItemDto(
	@Schema(nullable = true) Long financeNodeId,
	@Schema(nullable = true) String financeNodeName,
	@Schema(nullable = true) String financeNodeIcon,
	BigDecimal amount,
	@Schema(description = "ISO 4217 code denominating amount. Every line item of one event shares it.")
	String currency
) {

    /**
     * The currency a set of line items is denominated in.
     *
     * <p>Reading the first one is sufficient because
     * {@link com.mypaybyday.validation.TransactionValidator#validateSingleCurrency} guarantees
     * they all agree before anything is persisted.
     *
     * @return the shared ISO 4217 code, or {@code null} when none of the items declares one
     */
    public static String currencyOf(List<FinanceLineItemDto> items) {
	if (items == null) return null;
	return items.stream()
		.map(FinanceLineItemDto::currency)
		.filter(Objects::nonNull)
		.findFirst()
		.orElse(null);
    }

    public static FinanceLineItemDto from(FinanceLineItemEntity item) {
	return new FinanceLineItemDto(
		item.financeNode != null ? item.financeNode.id : null,
		item.financeNode != null ? item.financeNode.name : null,
		item.financeNode != null ? item.financeNode.icon : null,
		item.amount,
		item.currency
	);
    }
}
