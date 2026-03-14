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
        String budgetsInfo = "no specific category budgets set";
        if (budgets != null && !budgets.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            for (TimePeriodBudget b : budgets) {
                sb.append(String.format("category '%s' has budget %s, ",
                        b.category != null ? b.category.name : "unknown",
                        b.budgetedAmount));
            }
            budgetsInfo = "with " + sb.toString();
        }
        return String.format("The time period '%s' spans from %s to %s. It is configured %s.",
                name, startDate, endDate, budgetsInfo);
    }
}
