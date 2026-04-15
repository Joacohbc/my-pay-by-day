package com.mypaybyday.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

import com.mypaybyday.enums.EntityType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * An entity that represents an incomplete or draft state of any entity.
 *
 * <p>
 * This entity deliberately avoids the strict validations of typed entities.
 * The draft state is kept entirely as a raw JSON string to support any intermediate frontend state.
 */
@Entity(name = "Draft")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DraftEntity extends BaseEntity {

	/**
	* Optional link to the original entity if this draft represents an edit of a pre-existing
	* finalized entity.
	*/
	private Long originalEntityId;

	/**
	* The type of entity this draft represents.
	*/
	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private EntityType entityType;

	/**
	* The raw UI state representing the draft.
	*/
	@Column(columnDefinition = "TEXT")
	private String rawPayloadJson;

}
