package com.mypaybyday.dto;

import java.util.List;

public record DataTransferResult(
        int importedTags,
        int importedCategories,
        int importedNodes,
        int importedTagGroups,
        int importedEvents,
        int importedFiles,
        int importedSubscriptions,
        int importedTemplates,
        int importedTimePeriods,
        List<String> skippedEvents
) {}
