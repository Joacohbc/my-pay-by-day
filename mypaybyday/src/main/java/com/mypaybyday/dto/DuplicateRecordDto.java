package com.mypaybyday.dto;

import java.time.Instant;

import com.mypaybyday.enums.DuplicateRecordStatus;
import com.mypaybyday.enums.EntityType;

public class DuplicateRecordDto {
	public Long id;
	public EntityType entityType;
	public Long entityId1;
	public Long entityId2;
	public DuplicateRecordStatus status;
	public Double score;
	public Instant calculatedAt;

	public Object entity1;
	public Object entity2;
}
