package com.mypaybyday.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.OneToMany;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity(name = "TimePeriod")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimePeriodEntity extends BaseEntity {

	@NotBlank
	public String name;

	@NotNull
	public LocalDateTime startDate;

	@NotNull
	public LocalDateTime endDate;

	@OneToMany(mappedBy = "timePeriod", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
	@Builder.Default
	public Set<TimePeriodBudgetEntity> budgets = new HashSet<>();

	public BigDecimal savingsPercentageGoal;

	public BigDecimal budgetLimit;

}
