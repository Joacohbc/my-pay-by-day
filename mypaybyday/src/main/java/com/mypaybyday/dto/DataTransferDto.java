package com.mypaybyday.dto;

import java.time.LocalDateTime;
import java.util.List;

public record DataTransferDto(
        String version,
        LocalDateTime exportedAt,
        List<TagDto> tags,
        List<CategoryDto> categories,
        List<FinanceNodeDto> financeNodes,
        List<TagGroupDto> tagGroups,
        List<FinanceEventDto> events,
        List<FileExportDto> files,
        List<SubscriptionDto> subscriptions,
        List<TemplateDto> templates,
        List<TimePeriodDto> timePeriods
) {
    public static final String CURRENT_VERSION = "1.0";
}
