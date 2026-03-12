package com.mypaybyday.ai;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import com.mypaybyday.dto.CategoryBalanceDto;
import com.mypaybyday.dto.CategoryDto;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.CategoryService;
import com.mypaybyday.service.EventService;

import dev.langchain4j.agent.tool.Tool;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class FinanceAssistantTools {

    @Inject
    CategoryService categoryService;

    @Inject
    EventService eventService;

    @Tool("Lists all available financial categories. Use this tool to find a category ID if the user mentions a category name.")
    public List<CategoryDto> listAllCategories() {
        // Since we are returning a PagedResponse, we'll fetch the first page with a high limit.
        // For a large system, we might need a search tool, but for this prototype, fetching 100 is fine.
        return categoryService.listAll(0, 100).content();
    }

    @Tool("Calculates and returns the total income and outbound amounts for a specific category within a date range. " +
          "The 'from' and 'to' dates must be in the format 'yyyy-MM-ddTHH:mm:ss'. " +
          "This tool already performs the mathematical sum, DO NOT add or subtract the results yourself.")
    public CategoryBalanceDto getCategoryBalance(Long categoryId, String fromDateStr, String toDateStr) throws BusinessException {
        LocalDateTime from = LocalDateTime.parse(fromDateStr, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        LocalDateTime to = LocalDateTime.parse(toDateStr, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        return eventService.getCategoryBalance(categoryId, from, to);
    }
}
