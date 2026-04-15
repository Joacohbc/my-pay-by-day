package com.mypaybyday.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.HashSet;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity(name = "TimePeriod")
@Table(name = "TimePeriod")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimePeriodEntity extends BaseEntity {

	@NotBlank
	public String name;

	@NotNull
	public LocalDate startDate;

	@NotNull
	public LocalDate endDate;

	@OneToMany(mappedBy = "timePeriod", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
	@Builder.Default
	public Set<TimePeriodBudgetEntity> budgets = new HashSet<>();

	public BigDecimal savingsPercentageGoal;

	public BigDecimal budgetLimit;

}
