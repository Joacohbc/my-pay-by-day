package com.mypaybyday.entity;

import java.math.BigDecimal;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity(name = "TimePeriodBudget")
@Table(name = "TimePeriodBudget")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimePeriodBudgetEntity extends BaseEntity {

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "time_period_id")
	@NotNull
	public TimePeriodEntity timePeriod;

	@ManyToOne(fetch = FetchType.EAGER)
	@JoinColumn(name = "category_id")
	@NotNull
	public CategoryEntity category;

	@NotNull
	public BigDecimal budgetedAmount;

}
