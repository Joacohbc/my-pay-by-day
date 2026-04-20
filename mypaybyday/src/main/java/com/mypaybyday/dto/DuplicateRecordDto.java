package com.mypaybyday.dto;

import java.time.Instant;

import com.mypaybyday.entity.DuplicateEventRecordEntity;
import com.mypaybyday.entity.DuplicateRecordEntity;
import com.mypaybyday.enums.DuplicateRecordStatus;
import com.mypaybyday.enums.EntityType;
import com.mypaybyday.repository.CategoryRepository;
import com.mypaybyday.repository.TagRepository;

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

	public static DuplicateRecordDto fromEntity(DuplicateRecordEntity entity, CategoryRepository categoryRepository, TagRepository tagRepository) {
		DuplicateRecordDto dto;
		if (entity instanceof DuplicateEventRecordEntity eventEntity) {
			DuplicateEventRecordDto eventDto = new DuplicateEventRecordDto();
			eventDto.dateScore = eventEntity.dateScore;
			eventDto.amountScore = eventEntity.amountScore;
			eventDto.nodeScore = eventEntity.nodeScore;
			eventDto.categoryScore = eventEntity.categoryScore;
			eventDto.tagScore = eventEntity.tagScore;
			eventDto.nameScore = eventEntity.nameScore;
			dto = eventDto;
		} else {
			dto = new DuplicateRecordDto();
		}
		dto.id = entity.id;
		dto.entityType = entity.entityType;
		dto.entityId1 = entity.entityId1;
		dto.entityId2 = entity.entityId2;
		dto.status = entity.status;
		dto.score = entity.score;
		dto.calculatedAt = entity.calculatedAt;

		if (entity.entityType == EntityType.FINANCE_EVENT) {
			dto.entity1 = null;
			dto.entity2 = null;
		} else if (entity.entityType == EntityType.CATEGORY) {
			dto.entity1 = categoryRepository.findById(entity.entityId1);
			dto.entity2 = categoryRepository.findById(entity.entityId2);
		} else if (entity.entityType == EntityType.TAG) {
			dto.entity1 = tagRepository.findById(entity.entityId1);
			dto.entity2 = tagRepository.findById(entity.entityId2);
		}

		return dto;
	}
}
