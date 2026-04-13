package com.mypaybyday.dto;

import java.math.BigDecimal;
import java.util.List;

import dev.langchain4j.model.output.structured.Description;
import lombok.Data;

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

	@Description("The most appropriate category from the context, including its id, name and description. Null if not applicable.")
	private ExtractionCategoryDto category;

	@Description("List of tags from the context that best describe this event, each with id, name and description. Empty list if none apply.")
	private List<ExtractionTagDto> tags;

	@Description("Transaction date in YYYY-MM-DD format. Leave null if not explicitly mentioned.")
	private String transactionDate;

	@Data
	public static class ExtractionCategoryDto {

		@Description("The ID of the category from the context.")
		private Long id;

		@Description("The name of the category from the context.")
		private String name;

		@Description("The description of the category from the context.")
		private String description;
	}

	@Data
	public static class ExtractionTagDto {

		@Description("The ID of the tag from the context.")
		private Long id;

		@Description("The name of the tag from the context.")
		private String name;

		@Description("The description of the tag from the context.")
		private String description;
	}
}
