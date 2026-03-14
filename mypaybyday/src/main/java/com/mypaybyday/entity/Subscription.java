package com.mypaybyday.entity;

import com.mypaybyday.enums.RecurrenceFrequency;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Subscription extends BaseEntity {

    @NotBlank
    public String name;

    @NotNull
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "template_id")
    public Template template;

    @NotNull
    @Enumerated(EnumType.STRING)
    public RecurrenceFrequency recurrence;

    @NotNull
    public LocalDate nextExecutionDate;

    @Override
    public String toRagContent() {
        return String.format(
                "A recurring subscription named '%s' is scheduled with %s frequency. The next execution is planned for %s using the template '%s'.",
                name, recurrence, nextExecutionDate,
                template != null ? template.name : "unknown template");
    }
}
