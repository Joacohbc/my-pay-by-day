package com.mypaybyday.dto;

import java.time.Instant;
import java.util.List;

public record DataTransferDto(
        String version,
        Instant exportedAt,
        List<TagDto> tags,
        List<CategoryDto> categories,
        List<FinanceNodeDto> financeNodes,
        List<TagGroupDto> tagGroups,
        List<FinanceEventDto> events
) {
    public static final String CURRENT_VERSION = "1.0";
}
