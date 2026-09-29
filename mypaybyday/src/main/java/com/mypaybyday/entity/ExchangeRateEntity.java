package com.mypaybyday.entity;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.validation.constraints.NotNull;

import com.mypaybyday.enums.ExchangeRateSource;
import com.mypaybyday.validation.CurrencyValidator;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One quote in the append-only history of a currency's value: {@link #unitsPerBase} units of
 * {@link #currency} buy one unit of {@link #baseCurrency}. The newest row per currency is its
 * current rate; {@code createdAt} is when it was recorded.
 *
 * <p>Every currency is quoted against a single base, so the rate between any two currencies is the
 * ratio of their quotes and can never contradict itself the way independently entered pairs could.
 * The base is stored on each row so that changing the configured base never reinterprets old quotes.
 */
@Entity(name = "ExchangeRate")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExchangeRateEntity extends BaseEntity {

	@NotNull
	@Column(length = CurrencyValidator.CODE_LENGTH)
	public String currency;

	@NotNull
	@Column(length = CurrencyValidator.CODE_LENGTH)
	public String baseCurrency;

	@NotNull
	@Column(precision = 38, scale = 12)
	public BigDecimal unitsPerBase;

	@NotNull
	@Enumerated(EnumType.STRING)
	public ExchangeRateSource source;
}
