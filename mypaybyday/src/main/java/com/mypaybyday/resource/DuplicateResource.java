package com.mypaybyday.resource;

import java.util.List;

import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import com.mypaybyday.dto.DuplicateEventRecordDto;
import com.mypaybyday.dto.DuplicateRecordDto;
import com.mypaybyday.dto.ResolveDuplicateRequestDto;
import com.mypaybyday.entity.DuplicateRecordEntity;
import com.mypaybyday.entity.DuplicateEventRecordEntity;
import com.mypaybyday.enums.DuplicateRecordStatus;
import com.mypaybyday.enums.EntityType;
import com.mypaybyday.repository.DuplicateRecordRepository;
import com.mypaybyday.repository.EventRepository;
import com.mypaybyday.repository.CategoryRepository;
import com.mypaybyday.repository.TagRepository;
import com.mypaybyday.service.DuplicateDetectionService;

import org.eclipse.microprofile.openapi.annotations.tags.Tag;

@Path("/api/duplicates")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Duplicates", description = "Duplicate Detection Management")
public class DuplicateResource {

	@Inject
	DuplicateDetectionService duplicateDetectionService;

	@Inject
	DuplicateRecordRepository duplicateRecordRepository;

	@Inject
	EventRepository eventRepository;

	@Inject
	CategoryRepository categoryRepository;

	@Inject
	TagRepository tagRepository;

	@GET
	public Response getDuplicates(@QueryParam("type") EntityType type, @QueryParam("status") DuplicateRecordStatus status) {
		if (type == null || status == null) {
			return Response.status(Response.Status.BAD_REQUEST).entity("type and status are required").build();
		}

		List<DuplicateRecordEntity> records = duplicateRecordRepository.findByEntityTypeAndStatus(type, status);
		return Response.ok(records.stream().map(this::toDto).toList()).build();
	}

	@GET
	@Path("/entity/{type}/{id}")
	public Response getDuplicatesForEntity(@PathParam("type") EntityType type, @PathParam("id") Long id, @QueryParam("status") DuplicateRecordStatus status) {
		if (status == null) {
			status = DuplicateRecordStatus.PENDING;
		}
		List<DuplicateRecordEntity> records = duplicateRecordRepository.findByEntityIdAndStatus(type, id, status);
		return Response.ok(records.stream().map(this::toDto).toList()).build();
	}

	@POST
	@Path("/{id}/resolve")
	public Response resolveDuplicate(@PathParam("id") Long id, ResolveDuplicateRequestDto request) {
		duplicateDetectionService.resolveDuplicate(id, request.action, request.keepEntityId);
		return Response.ok().build();
	}

	private DuplicateRecordDto toDto(DuplicateRecordEntity entity) {
		DuplicateRecordDto dto;
		if (entity instanceof DuplicateEventRecordEntity) {
			DuplicateEventRecordDto eventDto = new DuplicateEventRecordDto();
			DuplicateEventRecordEntity eventEntity = (DuplicateEventRecordEntity) entity;
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
			dto.entity1 = null /* avoid complex mappings and return entity props from FE instead */;
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
