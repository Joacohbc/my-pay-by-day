package com.mypaybyday.dto;

import java.util.List;
import java.util.Map;

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
        List<String> skippedEvents,
        @com.fasterxml.jackson.annotation.JsonIgnore Map<Long, Long> fileIdMap
) {}
