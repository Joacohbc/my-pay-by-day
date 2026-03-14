package com.mypaybyday.entity;


import jakarta.persistence.Entity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.FetchType;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
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
@Table
public class TimePeriod extends BaseEntity {

    @NotBlank
    public String name;

    @NotNull
    public LocalDate startDate;

    @NotNull
    public LocalDate endDate;

    @OneToMany(mappedBy = "timePeriod", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    public List<TimePeriodBudget> budgets = new ArrayList<>();

    public BigDecimal savingsPercentageGoal;
    @Override
    public String toRagContent() {
        return String.format("The time period '%s' spans from %s to %s. It targets the category '%s' with a budgeted amount of %s.",
                name, startDate, endDate, 
                category != null ? category.name : "All",
                budgetedAmount != null ? budgetedAmount : "zero (no budget set)");
    }
}
