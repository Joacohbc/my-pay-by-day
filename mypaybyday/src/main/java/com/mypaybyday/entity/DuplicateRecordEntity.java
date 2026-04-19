package com.mypaybyday.entity;

import java.time.Instant;

import jakarta.persistence.DiscriminatorColumn;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Inheritance;
import jakarta.persistence.InheritanceType;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotNull;

import com.mypaybyday.enums.DuplicateRecordStatus;
import com.mypaybyday.enums.EntityType;
import lombok.Getter;
import lombok.Setter;

@Entity(name = "DuplicateRecord")
@Table(name = "duplicate_record", uniqueConstraints = {
	@UniqueConstraint(columnNames = {"entityType", "entityId1", "entityId2"})
})
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "record_type")
@Getter
@Setter
public abstract class DuplicateRecordEntity extends BaseEntity {

	@NotNull
	@Enumerated(EnumType.STRING)
	public EntityType entityType;

	@NotNull
	public Long entityId1;

	@NotNull
	public Long entityId2;

	@NotNull
	@Enumerated(EnumType.STRING)
	public DuplicateRecordStatus status = DuplicateRecordStatus.PENDING;

	@NotNull
	public Double score;

	@NotNull
	public Instant calculatedAt = Instant.now();

}
