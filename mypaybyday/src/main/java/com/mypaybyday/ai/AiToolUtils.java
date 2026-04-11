package com.mypaybyday.ai;

import com.mypaybyday.dto.CategoryDto;
import com.mypaybyday.dto.FinanceNodeDto;
import com.mypaybyday.dto.TagDto;
import com.mypaybyday.dto.TimePeriodDto;

import java.math.BigDecimal;
import java.time.temporal.Temporal;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Shared utility class for formatting lists of domain entities/DTOs
 * into string context for AI models to avoid duplication across services.
 */
public class AiToolUtils {

    private AiToolUtils() {
        // Prevent instantiation
    }

    public static String formatCategories(List<CategoryDto> categories, String defaultEmptyMessage) {
        if (categories == null || categories.isEmpty()) {
            return defaultEmptyMessage;
        }
        return categories.stream()
                .map(c -> String.format("[id=%d, name=%s]", c.id(), c.name()))
                .collect(Collectors.joining(", ", "Categories: ", ""));
    }

    public static String formatTags(List<TagDto> tags, String defaultEmptyMessage) {
        if (tags == null || tags.isEmpty()) {
            return defaultEmptyMessage;
        }
        return tags.stream()
                .map(t -> String.format("[id=%d, name=%s]", t.id(), t.name()))
                .collect(Collectors.joining(", ", "Tags: ", ""));
    }

    public static String formatFinanceNodes(List<FinanceNodeDto> nodes, String defaultEmptyMessage) {
        if (nodes == null || nodes.isEmpty()) {
            return defaultEmptyMessage;
        }
        return nodes.stream()
                .map(n -> String.format("[id=%d, name=%s, type=%s]", n.id(), n.name(), n.type()))
                .collect(Collectors.joining(", ", "Finance nodes: ", ""));
    }

    public static String formatTimePeriods(List<TimePeriodDto> periods, String defaultEmptyMessage) {
        if (periods == null || periods.isEmpty()) {
            return defaultEmptyMessage;
        }
        return periods.stream()
                .map(p -> String.format("[id=%d, name=%s, from=%s, to=%s, limit=%s, savingsGoal=%s%%]",
                        p.id(), p.name(),
                        formatDate(p.startDate()),
                        formatDate(p.endDate()),
                        formatAmount(p.budgetLimit()),
                        formatAmount(p.savingsPercentageGoal())))
                .collect(Collectors.joining("\n", "Time periods:\n", ""));
    }

    private static String formatAmount(BigDecimal amount) {
        return amount != null ? amount.toPlainString() : "none";
    }

    private static String formatDate(Temporal date) {
        return date != null ? date.toString() : "unknown date";
    }
}
