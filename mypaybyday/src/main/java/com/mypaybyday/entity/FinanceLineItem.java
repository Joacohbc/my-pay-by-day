package com.mypaybyday.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.mypaybyday.crypto.BigDecimalEncryptionConverter;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * The atomic unit of value movement within a {@link FinanceTransaction}.
 *
 * <p>Each LineItem links exactly one {@link FinanceNode} to a signed monetary amount,
 * representing a single side of a double-entry accounting movement. The collection of
 * all LineItems in a Transaction must satisfy the Zero-Sum Rule enforced by
 * {@link FinanceTransaction}.
 *
 * <p><b>Sign convention:</b> A positive amount represents value flowing <em>into</em>
 * the referenced {@link FinanceNode}; a negative amount represents value flowing
 * <em>out of</em> it. The interpretation is always relative to the node's perspective.
 *
 * <p><b>Categorization &amp; Tags:</b> Neither {@code category} nor {@code tags} live
 * on this entity. They belong exclusively to the parent {@link FinanceEvent} wrapper.
 * 
 * The operational layer is intentionally kept free of any classification concern;
 * it only cares about math and balance.
 */
@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table
public class FinanceLineItem extends BaseEntity {

    /**
     * The {@link FinanceTransaction} this line item belongs to.
     *
     * <p>Loaded lazily to avoid N+1 issues when querying transactions in bulk.
     * Excluded from JSON serialization since the parent context is always known
     * from the {@link FinanceEvent} wrapper.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_id")
    @JsonIgnore
    public FinanceTransaction transaction;

    /**
     * The {@link FinanceNode} (account, external entity, or contact) involved in this movement.
     *
     * <p>A FinanceNode with associated LineItems cannot be hard-deleted — only archived —
     * to preserve historical balance and debt calculations (Node Immutability Rule).
     */
    @NotNull
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "finance_node_id")
    public FinanceNode financeNode;

    /**
     * The signed monetary amount for this movement.
     *
     * <p>Positive values indicate inflow to the {@link FinanceNode}; negative values
     * indicate outflow. The sum of all amounts across all LineItems in the parent
     * {@link FinanceTransaction} must equal zero (Zero-Sum Rule).
     *
     * <p><b>Encrypted at rest</b> via AES-256-GCM (stored as TEXT in the database).
     * Cannot be used in JPQL/SQL {@code WHERE}, {@code SUM()}, {@code AVG()},
     * {@code MAX()}, {@code MIN()}, or {@code ORDER BY} clauses — aggregate or
     * compare in memory after loading.
     */
    @NotNull
    @Convert(converter = BigDecimalEncryptionConverter.class)
    @Column(columnDefinition = "TEXT")
    public BigDecimal amount;

}
