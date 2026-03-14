package com.mypaybyday.entity;

import com.mypaybyday.crypto.StringEncryptionConverter;
import com.mypaybyday.enums.EventType;

import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import dev.langchain4j.data.document.Metadata;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * The human-readable wrapper around the raw accounting data.
 *
 * <p>
 * This is the primary entity exposed to the user. Users do not create
 * {@link FinanceTransaction}s
 * directly; they create Events (e.g., "Dinner with friends", "Paid Rent"). The
 * Event holds
 * all human context — description, receipt, and the logical date of occurrence
 * — while the
 * underlying {@link FinanceTransaction} and its {@link FinanceLineItem}s are
 * managed exclusively by the
 * backend engine.
 */
@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table
public class FinanceEvent extends BaseEntity {

    /**
     * Human-readable name for the event (e.g., "Dinner with friends", "Paid Rent").
     *
     * <p>
     * <b>Encrypted at rest</b> via AES-256-GCM. Cannot be used in JPQL/SQL
     * {@code WHERE}, {@code LIKE}, or {@code ORDER BY} clauses — filter or sort
     * in memory after loading.
     */
    @NotBlank
    @Convert(converter = StringEncryptionConverter.class)
    public String name;

    /**
     * Optional free-text description providing additional context about the event.
     *
     * <p>
     * <b>Encrypted at rest</b> via AES-256-GCM. Cannot be used in JPQL/SQL
     * {@code WHERE} or {@code LIKE} clauses — filter in memory after loading.
     */
    @Convert(converter = StringEncryptionConverter.class)
    public String description;

    /**
     * URL pointing to an attached receipt or supporting document for this event.
     *
     * <p>
     * <b>Encrypted at rest</b> via AES-256-GCM. Cannot be used in JPQL/SQL
     * {@code WHERE} clauses — compare in memory after loading.
     */
    @Convert(converter = StringEncryptionConverter.class)
    public String receiptUrl;

    /**
     * Directional nature of this event.
     *
     * <ul>
     * <li>{@link EventType#INBOUND} — money flowing into an own account (e.g.,
     * salary).</li>
     * <li>{@link EventType#OUTBOUND} — money flowing out of an own account (e.g.,
     * purchase).</li>
     * <li>{@link EventType#OTHER} — internal transfers or neutral movements.</li>
     * </ul>
     */
    @NotNull
    @Enumerated(EnumType.STRING)
    public EventType type;

    /**
     * The accounting envelope generated for this event.
     *
     * <p>
     * Exactly one {@link FinanceTransaction} is associated per Event. The
     * Transaction enforces
     * the Zero-Sum Rule: the sum of all origin {@link FinanceLineItem} amounts must
     * equal the sum
     * of all destination amounts.
     */
    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "transaction_id")
    public FinanceTransaction transaction;

    /**
     * The budget bucket this event is assigned to (e.g., "Food", "Transport",
     * "Utilities").
     *
     * <p>
     * Together with {@code tags}, this is the only place where classification
     * lives.
     * The underlying {@link FinanceLineItem}s carry no category of their own.
     */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id")
    public Category category;

    /**
     * Transversal labels applied to this event (e.g., {@code #Vacation2026},
     * {@code #Reimbursable}).
     */
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "event_tag", joinColumns = @JoinColumn(name = "event_id"), inverseJoinColumns = @JoinColumn(name = "tag_id"))
    @Builder.Default
    public List<Tag> tags = new ArrayList<>();

    @Override
    public String toRagContent() {
        StringBuilder sb = new StringBuilder();
        sb.append(String.format("A finance event called '%s' (ID: %s) occurred on %s. ",
                name, id != null ? id : "NEW",
                transaction != null ? transaction.transactionDate : "an unknown date"));
        sb.append(String.format("It is an %s event categorized as %s. ",
                type, category != null ? category.name : "Uncategorized"));

        if (tags != null && !tags.isEmpty()) {
            sb.append("Tags: ").append(tags.stream().map(t -> t.name).collect(Collectors.joining(", "))).append(". ");
        }

        if (transaction != null && transaction.lineItems != null && !transaction.lineItems.isEmpty()) {
            sb.append("Line items: ");
            String items = transaction.lineItems.stream()
                    .map(li -> String.format("%s %s for %s (ID: %s)",
                            li.amount != null ? li.amount : "0",
                            li.amount != null && li.amount.compareTo(java.math.BigDecimal.ZERO) >= 0 ? "received"
                                    : "paid",
                            li.financeNode != null ? li.financeNode.name : "unknown",
                            li.financeNode != null && li.financeNode.id != null ? li.financeNode.id : "unknown"))
                    .collect(Collectors.joining(", "));
            sb.append(items).append(". ");
        }

        if (description != null && !description.isBlank()) {
            sb.append("Additional details: ").append(description);
        } else {
            sb.append("No further details available.");
        }

        return sb.toString();
    }

    @Override
    public Metadata toRagMetadata() {
        Metadata metadata = super.toRagMetadata();
        if (category != null) {
            metadata.put("category_id", category.id != null ? category.id.toString() : "unknown");
            metadata.put("category_name", category.name);
        }

        if (tags != null && !tags.isEmpty()) {
            metadata.put("tags", tags.stream().map(t -> t.name).collect(Collectors.joining(",")));
        }

        if (transaction != null && transaction.lineItems != null) {
            metadata.put("node_ids", transaction.lineItems.stream()
                    .map(li -> li.financeNode != null && li.financeNode.id != null ? li.financeNode.id.toString()
                            : "unknown")
                    .distinct()
                    .collect(Collectors.joining(",")));
        }

        return metadata;
    }
}
