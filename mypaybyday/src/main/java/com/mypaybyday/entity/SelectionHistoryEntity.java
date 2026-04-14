package com.mypaybyday.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import com.mypaybyday.enums.EntityType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Tracks the selection history of entities by the user in the UI.
 * Used to calculate "recently used" and "most selected" items.
 */
@Entity(name = "SelectionHistoryEntity")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "SelectionHistoryEntity", uniqueConstraints = @UniqueConstraint(columnNames = { "entityType", "entityId" }))
public class SelectionHistoryEntity extends BaseEntity {

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	public EntityType entityType;

	@Column(nullable = false)
	public Long entityId;

	@Column(nullable = false)
	public Instant selectedAt;

	@Column(nullable = false)
	public long selectionCount;

}
