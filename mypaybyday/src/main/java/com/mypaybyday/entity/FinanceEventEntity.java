package com.mypaybyday.entity;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

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
import jakarta.persistence.Transient;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.mypaybyday.crypto.StringEncryptionConverter;
import com.mypaybyday.enums.EventType;
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
 * {@link FinanceTransactionEntity}s
 * directly; they create Events (e.g., "Dinner with friends", "Paid Rent"). The
 * Event holds
 * all human context — description, receipt, and the logical date of occurrence
 * — while the
 * underlying {@link FinanceTransactionEntity} and its {@link FinanceLineItemEntity}s are
 * managed exclusively by the
 * backend engine.
 */
@Entity(name = "FinanceEvent")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinanceEventEntity extends BaseEntity {

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
	* Exactly one {@link FinanceTransactionEntity} is associated per Event. The
	* Transaction enforces
	* the Zero-Sum Rule: the sum of all origin {@link FinanceLineItemEntity} amounts must
	* equal the sum
	* of all destination amounts.
	*/
	@OneToOne(fetch = FetchType.EAGER)
	public FinanceTransactionEntity transaction;

	/**
	* The budget bucket this event is assigned to (e.g., "Food", "Transport",
	* "Utilities").
	*
	* <p>
	* Together with {@code tags}, this is the only place where classification
	* lives.
	* The underlying {@link FinanceLineItemEntity}s carry no category of their own.
	*/
	@ManyToOne(fetch = FetchType.EAGER)
	public CategoryEntity category;

	/**
	* Transversal labels applied to this event (e.g., {@code #Vacation2026},
	* {@code #Reimbursable}).
	*/
	@ManyToMany(fetch = FetchType.EAGER)
	@JoinTable(name = "finance_event_tag", joinColumns = @JoinColumn(name = "event_id"), inverseJoinColumns = @JoinColumn(name = "tag_id"))
	@Builder.Default
	public Set<TagEntity> tags = new HashSet<>();

	/**
	* Bidirectional relationship to other FinanceEvents.
	*
	* <p>Uses {@code Set} instead of {@code List} so that Hibernate tracks this collection with
	* element-level diff semantics. With a {@code List} (bag), any modification triggers a full
	* {@code DELETE FROM event_relation WHERE event_id=?} followed by re-inserts for the entire
	* collection. When two collections are dirtied in the same transaction (A→B and B→A), SQLite
	* raises {@code SQLITE_BUSY} on the back-to-back deletes against the same table. With a
	* {@code Set}, Hibernate only issues individual {@code INSERT}s or {@code DELETE}s for the
	* elements that actually changed.
	*/
	@ManyToMany(fetch = FetchType.LAZY)
	@JoinTable(
		name = "finance_event_finance_event",
		joinColumns = @JoinColumn(name = "event_id"),
		inverseJoinColumns = @JoinColumn(name = "related_event_id")
	)
	@Builder.Default
	public Set<FinanceEventEntity> relatedEvents = new HashSet<>();

	/**
	* Optional link to the subscription that generated this event or is associated with it.
	*/
	@ManyToOne(fetch = FetchType.LAZY)
	public SubscriptionEntity subscription;

	/**
	* Transient property to hold file IDs during request parsing.
	*/
	@Transient
	@JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
	public List<Long> fileIds;

	/**
	* Attached files (images, documents, videos).
	*/
	@ManyToMany(fetch = FetchType.LAZY)
	@JoinTable(
		name = "finance_event_file",
		joinColumns = @JoinColumn(name = "event_id"),
		inverseJoinColumns = @JoinColumn(name = "file_id")
	)
	@Builder.Default
	public Set<FileEntity> files = new HashSet<>();

}
