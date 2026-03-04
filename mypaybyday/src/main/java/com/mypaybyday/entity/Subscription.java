package com.mypaybyday.entity;

import com.mypaybyday.enums.RecurrenceFrequency;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

@Entity
public class Subscription extends PanacheEntity {

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

    public Subscription() {}
}
