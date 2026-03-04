package com.mypaybyday.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import java.util.ArrayList;
import java.util.List;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * The human-readable wrapper around the raw accounting data.
 *
 * <p>This is the primary entity exposed to the user. Users do not create {@link Transaction}s
 * directly; they create Events (e.g., "Dinner with friends", "Paid Rent"). The Event holds
 * all human context — description, receipt, and the logical date of occurrence — while the
 * underlying {@link Transaction} and its {@link LineItem}s are managed exclusively by the
 * backend engine.
 */
@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Event extends PanacheEntity {

    /** Human-readable name for the event (e.g., "Dinner with friends", "Paid Rent"). */
    @NotBlank
    public String name;

    /** Optional free-text description providing additional context about the event. */
    public String description;

    /** URL pointing to an attached receipt or supporting document for this event. */
    public String receiptUrl;

    /**
     * The accounting envelope generated for this event.
     *
     * <p>Exactly one {@link Transaction} is associated per Event. The Transaction enforces
     * the Zero-Sum Rule: the sum of all origin {@link LineItem} amounts must equal the sum
     * of all destination amounts.
     */
    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "transaction_id")
    public Transaction transaction;

    /**
     * The budget bucket this event is assigned to (e.g., "Food", "Transport", "Utilities").
     *
     * <p>Together with {@code tags}, this is the only place where classification lives.
     * The underlying {@link LineItem}s carry no category of their own.
     */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id")
    public Category category;

    /**
     * Transversal labels applied to this event (e.g., {@code #Vacation2026}, {@code #Reimbursable}).
     */
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "event_tag",
        joinColumns = @JoinColumn(name = "event_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    @Builder.Default
    public List<Tag> tags = new ArrayList<>();
}
