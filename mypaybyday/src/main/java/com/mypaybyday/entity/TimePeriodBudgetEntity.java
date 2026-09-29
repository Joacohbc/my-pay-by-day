package com.mypaybyday.entity;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.validation.constraints.NotNull;

import com.mypaybyday.validation.CurrencyValidator;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity(name = "TimePeriodBudget")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimePeriodBudgetEntity extends BaseEntity {

	@ManyToOne(fetch = FetchType.LAZY)
	@NotNull
	public TimePeriodEntity timePeriod;

	@ManyToOne(fetch = FetchType.EAGER)
	@NotNull
	public CategoryEntity category;

	@NotNull
	public BigDecimal budgetedAmount;

	/**
	* The ISO 4217 code denominating {@link #budgetedAmount}.
	*
	* <p>
	* Independent of the parent period's own currency, so one period can cap a category at
	* 30.000 UYU and another at 200 USD without either being converted.
	*/
	@NotNull
	@Column(length = CurrencyValidator.CODE_LENGTH)
	public String currency;

}
