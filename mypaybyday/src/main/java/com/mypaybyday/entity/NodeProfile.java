package com.mypaybyday.entity;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Embeddable;

import com.mypaybyday.crypto.BigDecimalEncryptionConverter;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Optional capabilities a {@link FinanceNodeEntity} may declare.
 *
 * <p>
 * Deliberately free of any financial-product vocabulary: this type describes
 * <em>what a node can do</em>, never <em>what a node is</em>. A credit card is not
 * modelled anywhere in the system — it is simply a node that happens to declare both
 * a balance limit and a cycle. The same two capabilities also express an account
 * overdraft, a lending cap on a contact, or a savings target.
 *
 * <p>
 * The two capabilities are orthogonal: a node may declare a limit, a cycle, both, or
 * neither. Use {@link #hasLimit()} and {@link #hasCycle()} to test for them —
 * <b>never</b> a null check on the embeddable itself, since Hibernate may materialise
 * an all-null embeddable as a non-null instance.
 */
@Embeddable
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NodeProfile {

	/**
	* Signed boundary the node's balance is expected to stay within, measured from zero.
	*
	* <p>
	* The sign carries the direction, which is what lets a single field express both
	* floors and ceilings:
	* <ul>
	* <li><b>Negative</b> — a floor for a liability. The balance should not fall below
	* it (e.g. a credit limit, an overdraft, the most you are willing to lend).</li>
	* <li><b>Positive</b> — a ceiling to reach. The balance should climb towards it
	* (e.g. a savings target).</li>
	* </ul>
	*
	* <p>
	* <b>Encrypted at rest</b> via AES-256-GCM (stored as TEXT). Cannot be used in
	* JPQL/SQL {@code WHERE}, {@code SUM()}, or {@code ORDER BY} clauses — compare in
	* memory after loading.
	*/
	@Convert(converter = BigDecimalEncryptionConverter.class)
	@Column(columnDefinition = "TEXT")
	public BigDecimal balanceLimit;

	/**
	* Day of the month on which the node's cycle closes.
	*
	* <p>
	* Constrained to 1..28 so that every month has the day and no clamping is ever
	* required.
	*/
	public Integer cycleDay;

	/**
	* Day of the month on which a closed cycle is settled.
	*
	* <p>
	* Constrained to 1..28 for the same reason as {@link #cycleDay}.
	*/
	public Integer settlementDay;

	public boolean hasLimit() {
		return balanceLimit != null;
	}

	public boolean hasCycle() {
		return cycleDay != null && settlementDay != null;
	}
}
