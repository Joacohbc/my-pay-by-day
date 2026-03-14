package com.mypaybyday.dto;

import com.mypaybyday.enums.EventType;
import java.math.BigDecimal;
import java.util.List;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import dev.langchain4j.model.output.structured.Description;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FinanceEventExtractionDto {

    @Description("A short name for the event")
    private String name;

    @Description("A description of the event")
    private String description;

    @Description("The type of event: INBOUND for income, OUTBOUND for expenses, OTHER for transfers")
    private EventType type;

    @Description("The ID of the category this event belongs to. Find the best matching category from the context.")
    private Long categoryId;

    @Description("A list of tag IDs that apply to this event, found in the context.")
    private List<Long> tagIds;

    @Description("The date of the transaction in YYYY-MM-DD format. Use the current date if not specified.")
    private String transactionDate;

    @Description("The line items for this transaction. Must follow the zero-sum rule (sum of amounts = 0). Outbound money is positive for the destination, negative for the origin.")
    private List<LineItemExtractionDto> lineItems;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LineItemExtractionDto {
        @Description("The ID of the finance node involved. Find the best match from the context.")
        private Long nodeId;

        @Description("The amount of money. Negative for money leaving the node, positive for money entering the node.")
        private BigDecimal amount;
    }
}
