package com.mypaybyday.entity;

import jakarta.persistence.Convert;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import com.mypaybyday.crypto.StringEncryptionConverter;
import com.mypaybyday.enums.FinanceNodeType;
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

	public String color;

	@Builder.Default
	public boolean archived = false;

	/**
	* Optional capabilities declared by this node (balance limit and/or cycle).
	*
	* <p>
	* May be {@code null} for a node that declares neither, and Hibernate may equally
	* materialise an all-null embeddable as a non-null instance. Neither case is a
	* reliable signal, so capability checks must go through
	* {@link NodeProfile#hasLimit()} / {@link NodeProfile#hasCycle()} on a non-null
	* profile, never a null check on this field alone.
	*/
	@Embedded
	public NodeProfile profile;

}
