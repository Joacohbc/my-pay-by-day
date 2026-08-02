package com.mypaybyday.dto;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

import com.mypaybyday.enums.DataSection;

/**
 * The {@code data.json} manifest of an export archive.
 *
 * <p>
 * The payload stays a typed record so the OpenAPI schema, and the clients generated from it, keep
 * describing what an archive actually contains. {@link #section(DataSection)} and
 * {@link #from(Map)} are the bridge that lets a generic per-section loop drive it; their exhaustive
 * switches are what fails the build when a {@link DataSection} is added without a payload field.
 */
import com.mypaybyday.service.DataTransferService;

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
        List<TimePeriodDto> timePeriods,
        List<DraftDto> drafts,
        List<PaymentPlanExportDto> paymentPlans,
        DuplicateDetectionSettingsDto duplicateDetectionSettings
) {
    public static final String CURRENT_VERSION = DataTransferService.CURRENT_VERSION;

    public List<?> section(DataSection section) {
        return switch (section) {
            case TAGS -> nullToEmpty(tags);
            case CATEGORIES -> nullToEmpty(categories);
            case FINANCE_NODES -> nullToEmpty(financeNodes);
            case FILES -> nullToEmpty(files);
            case TAG_GROUPS -> nullToEmpty(tagGroups);
            case SUBSCRIPTIONS -> nullToEmpty(subscriptions);
            case TEMPLATES -> nullToEmpty(templates);
            case TIME_PERIODS -> nullToEmpty(timePeriods);
            case EVENTS -> nullToEmpty(events);
            case DRAFTS -> nullToEmpty(drafts);
            case PAYMENT_PLANS -> nullToEmpty(paymentPlans);
            case DUPLICATE_DETECTION_SETTINGS ->
                    duplicateDetectionSettings == null ? List.of() : List.of(duplicateDetectionSettings);
        };
    }

    public static DataTransferDto from(Map<DataSection, List<?>> sections) {
        return new DataTransferDto(
                CURRENT_VERSION,
                LocalDateTime.now(ZoneOffset.UTC),
                sectionList(sections, DataSection.TAGS),
                sectionList(sections, DataSection.CATEGORIES),
                sectionList(sections, DataSection.FINANCE_NODES),
                sectionList(sections, DataSection.TAG_GROUPS),
                sectionList(sections, DataSection.EVENTS),
                sectionList(sections, DataSection.FILES),
                sectionList(sections, DataSection.SUBSCRIPTIONS),
                sectionList(sections, DataSection.TEMPLATES),
                sectionList(sections, DataSection.TIME_PERIODS),
                sectionList(sections, DataSection.DRAFTS),
                sectionList(sections, DataSection.PAYMENT_PLANS),
                firstOrNull(sectionList(sections, DataSection.DUPLICATE_DETECTION_SETTINGS)));
    }

    private static <T> List<T> nullToEmpty(List<T> items) {
        return items == null ? List.of() : items;
    }

    @SuppressWarnings("unchecked")
    private static <T> List<T> sectionList(Map<DataSection, List<?>> sections, DataSection section) {
        return (List<T>) sections.getOrDefault(section, List.of());
    }

    private static <T> T firstOrNull(List<T> items) {
        return items.isEmpty() ? null : items.get(0);
    }
}
