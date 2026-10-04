package com.mypaybyday.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.validation.constraints.NotNull;

import com.mypaybyday.validation.CurrencyValidator;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A currency the user works with.
 *
 * <p>A <b>principal</b> currency is one every transaction is converted into: when a transaction is
 * recorded, the current rate to each principal currency is frozen on it as a
 * {@link TransactionConversionEntity}. Views shown in a principal currency therefore include every
 * transaction; views in any other currency include only the transactions recorded in it.
 *
 * <p>The <b>base</b> currency is the one every exchange rate is quoted against. At most one row is
 * marked; while none is, the configured {@code mypaybyday.exchange-rate.base-currency} is the base.
 */
@Entity(name = "Currency")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CurrencyEntity extends BaseEntity {

	@NotNull
	@Column(length = CurrencyValidator.CODE_LENGTH, unique = true)
	public String code;

	@Builder.Default
	public boolean principal = false;

	@Builder.Default
	public boolean base = false;
}
