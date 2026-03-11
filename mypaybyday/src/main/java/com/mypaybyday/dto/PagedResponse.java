package com.mypaybyday.dto;

import java.util.List;

/**
 * Generic pagination envelope returned by every paginated list endpoint.
 *
 * @param content       The items on the current page.
 * @param page          Zero-based page index requested.
 * @param size          Maximum number of items per page.
 * @param totalElements Total number of items across all pages.
 * @param totalPages    Total number of pages.
 */
public record PagedResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
    public static <T> PagedResponse<T> of(List<T> content, int page, int size, long totalElements) {
        int totalPages = size <= 0 ? 1 : (int) Math.ceil((double) totalElements / size);
        return new PagedResponse<>(content, page, size, totalElements, totalPages);
    }
}
