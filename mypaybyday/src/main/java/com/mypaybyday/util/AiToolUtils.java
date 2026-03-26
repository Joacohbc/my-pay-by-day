package com.mypaybyday.util;

import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;

public class AiToolUtils {

    private AiToolUtils() {
        // Prevent instantiation
    }

    /**
     * Reusable utility to format a list of items into a comma-separated string
     * with a specific prefix.
     *
     * @param items    The list of items to format.
     * @param mapper   A function to convert each item into a string representation.
     * @param prefix   The prefix for the resulting string (e.g., "Categories: ").
     * @param emptyMsg The message to return if the list is empty.
     * @param <T>      The type of the items in the list.
     * @return The formatted string.
     */
    public static <T> String formatList(List<T> items, Function<T, String> mapper, String prefix, String emptyMsg) {
        if (items == null || items.isEmpty()) {
            return emptyMsg;
        }
        return items.stream()
                .map(mapper)
                .collect(Collectors.joining(", ", prefix, ""));
    }
}
