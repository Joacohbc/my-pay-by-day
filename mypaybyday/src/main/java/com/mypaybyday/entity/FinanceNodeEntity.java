package com.mypaybyday.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import com.mypaybyday.crypto.StringEncryptionConverter;
import com.mypaybyday.enums.FinanceNodeType;
import com.mypaybyday.validation.CurrencyValidator;
import com.mypaybyday.validation.RegexValidator;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity(name = "FinanceNode")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinanceNodeEntity extends BaseEntity {

	/**
	* Display name of this node (e.g., "BBVA cuenta sueldo", "Visa 4567").
	*
	* <p>
	* <b>Encrypted at rest</b> via AES-256-GCM. Cannot be used in JPQL/SQL
	* {@code WHERE}, {@code LIKE}, or {@code ORDER BY} clauses — filter or sort
	* in memory after loading.
	*/
	@NotBlank
	@Convert(converter = StringEncryptionConverter.class)
	public String name;

	@NotNull
	@Enumerated(EnumType.STRING)
	public FinanceNodeType type;

	public String description;

	public String icon;

	@Column(length = RegexValidator.COLOR_MAX_LENGTH)
	public String color;

	@Builder.Default
	public boolean archived = false;

	/**
	* The ISO 4217 code this node is denominated in, or {@code null} when it holds no particular
	* currency.
	*
	* <p>
	* Own accounts are denominated ("Itau caja de ahorro" is UYU); external entities and contacts
	* usually are not, since a supermarket can charge in whichever currency it likes. When set,
	* every line item touching this node must match it, which is what catches a USD charge
	* recorded against a UYU account.
	*/
	@Column(length = CurrencyValidator.CODE_LENGTH)
	public String currency;

}
