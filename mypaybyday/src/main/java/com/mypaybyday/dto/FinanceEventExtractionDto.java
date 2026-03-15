package com.mypaybyday.dto;

import dev.langchain4j.model.output.structured.Description;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class FinanceEventExtractionDto {

    @Description("Short name for the event (e.g., 'Groceries', 'Salary')")
    private String name;

    @Description("Total absolute amount of the transaction. Always positive.")
    private BigDecimal amount;

    @Description("The ID of the origin finance node (where the money comes from), found in the context.")
    private Long sourceNodeId;

    @Description("The ID of the destination finance node (where the money goes to), found in the context.")
    private Long destinationNodeId;

    @Description("The ID of the category, found in the context. Null if not applicable.")
    private Long categoryId;

    @Description("Transaction date in YYYY-MM-DD format. Leave null if not explicitly mentioned.")
    private String transactionDate;
}
