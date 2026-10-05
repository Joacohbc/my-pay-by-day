package com.mypaybyday.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.validation.constraints.NotNull;

import com.mypaybyday.enums.JobStatus;
import com.mypaybyday.validation.CurrencyValidator;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A request to re-price past transactions: every transaction recorded in {@link #sourceCurrency},
 * dated within {@link #startDate}–{@link #endDate} when given, gets {@link #rate} as its conversion
 * into {@link #targetCurrency}, replacing whatever rate was frozen on it.
 *
 * <p>It is also the record of what happened: a background job works through it and leaves the
 * outcome in {@link #status}, {@link #recalculatedCount} and {@link #message}.
 */
@Entity(name = "ConversionRecalculation")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversionRecalculationEntity extends BaseEntity {

	@NotNull
	@Column(length = CurrencyValidator.CODE_LENGTH)
	public String sourceCurrency;

	@NotNull
	@Column(length = CurrencyValidator.CODE_LENGTH)
	public String targetCurrency;

	/** Units of {@link #targetCurrency} per one unit of {@link #sourceCurrency}. */
	@NotNull
	@Column(precision = 38, scale = 12)
	public BigDecimal rate;

	public LocalDateTime startDate;

	public LocalDateTime endDate;

	@NotNull
	@Enumerated(EnumType.STRING)
	public JobStatus status;

	public int recalculatedCount;

	public String message;
}
