package com.mypaybyday.entity;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotNull;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.mypaybyday.enums.ConversionOrigin;
import com.mypaybyday.validation.CurrencyValidator;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * The exchange rate frozen on a transaction for one target currency: every line-item amount
 * multiplied by {@link #rate} is its value in {@link #currency}.
 *
 * <p>Only the rate is stored, never the converted amount, because the amounts are encrypted at rest
 * and a rate reveals nothing about them. The converted amount is exact and reproducible from the two.
 */
@Entity(name = "TransactionConversion")
@Table(uniqueConstraints = @UniqueConstraint(columnNames = { "transaction_id", "currency" }))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionConversionEntity extends BaseEntity {

	@JsonIgnore
	@NotNull
	@ManyToOne(fetch = FetchType.LAZY)
	public FinanceTransactionEntity transaction;

	@NotNull
	@Column(length = CurrencyValidator.CODE_LENGTH)
	public String currency;

	@NotNull
	@Column(precision = 38, scale = 12)
	public BigDecimal rate;

	@NotNull
	@Enumerated(EnumType.STRING)
	public ConversionOrigin origin;
}
