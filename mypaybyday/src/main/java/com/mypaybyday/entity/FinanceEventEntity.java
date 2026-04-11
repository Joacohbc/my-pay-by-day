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
import jakarta.persistence.Transient;
import java.util.ArrayList;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonProperty;
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
@Table(name = "FinanceEvent")
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
	* Exactly one {@link FinanceTransactionEntity} is associated per Event. The
	* Transaction enforces
	* the Zero-Sum Rule: the sum of all origin {@link FinanceLineItemEntity} amounts must
	* equal the sum
	* of all destination amounts.
	*/
	@OneToOne(fetch = FetchType.EAGER)
	@JoinColumn(name = "transaction_id")
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
	@JoinColumn(name = "category_id")
	public CategoryEntity category;

	/**
	* Transversal labels applied to this event (e.g., {@code #Vacation2026},
	* {@code #Reimbursable}).
	*/
	@ManyToMany(fetch = FetchType.EAGER)
	@JoinTable(name = "event_tag", joinColumns = @JoinColumn(name = "event_id"), inverseJoinColumns = @JoinColumn(name = "tag_id"))
	@Builder.Default
	public List<TagEntity> tags = new ArrayList<>();

	/**
	* Bidirectional relationship to other FinanceEvents.
	*/
	@ManyToMany(fetch = FetchType.LAZY)
	@JoinTable(
		name = "event_relation",
		joinColumns = @JoinColumn(name = "event_id"),
		inverseJoinColumns = @JoinColumn(name = "related_event_id")
	)
	@Builder.Default
	public List<FinanceEventEntity> relatedEvents = new ArrayList<>();

	/**
	* Optional link to the subscription that generated this event or is associated with it.
	*/
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "subscription_id")
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
		name = "event_file",
		joinColumns = @JoinColumn(name = "event_id"),
		inverseJoinColumns = @JoinColumn(name = "file_id")
	)
	@Builder.Default
	public List<FileEntity> files = new ArrayList<>();

}
