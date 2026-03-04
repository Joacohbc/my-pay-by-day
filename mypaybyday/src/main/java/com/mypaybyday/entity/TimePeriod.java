package com.mypaybyday.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
public class TimePeriod extends PanacheEntity {

    @NotBlank
    public String name;

    @NotNull
    public LocalDate startDate;

    @NotNull
    public LocalDate endDate;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id")
    public Category category;

    public BigDecimal budgetedAmount;

    public BigDecimal savingsPercentageGoal;

    public TimePeriod() {}
}
