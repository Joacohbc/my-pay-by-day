package com.mypaybyday.dto;

import com.mypaybyday.entity.Subscription;
import com.mypaybyday.enums.RecurrenceFrequency;
import java.time.LocalDate;

public record SubscriptionDto(
    Long id,
    String name,
    Long templateId,
    String templateName,
    RecurrenceFrequency recurrence,
    LocalDate nextExecutionDate
) {
    public static SubscriptionDto from(Subscription s) {
        return new SubscriptionDto(
            s.id,
            s.name,
            s.template != null ? s.template.id : null,
            s.template != null ? s.template.name : null,
            s.recurrence,
            s.nextExecutionDate
        );
    }
}
