package com.mypaybyday.resource;


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

import com.mypaybyday.dto.ResolveDuplicateRequestDto;
import com.mypaybyday.enums.DuplicateRecordStatus;
import com.mypaybyday.enums.EntityType;
import com.mypaybyday.service.duplicate.DuplicateDetectionService;

import org.eclipse.microprofile.openapi.annotations.tags.Tag;

@Path("/duplicates")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Duplicates", description = "Duplicate Detection Management")
public class DuplicateResource {

	@Inject
	DuplicateDetectionService duplicateDetectionService;

	@GET
	public Response getDuplicates(@QueryParam("type") EntityType type, @QueryParam("status") DuplicateRecordStatus status) {
		if (type == null || status == null) {
			return Response.status(Response.Status.BAD_REQUEST).entity("type and status are required").build();
		}

		return Response.ok(duplicateDetectionService.getDuplicates(type, status)).build();
	}

	@GET
	@Path("/entity/{type}/{id}")
	public Response getDuplicatesForEntity(@PathParam("type") EntityType type, @PathParam("id") Long id, @QueryParam("status") DuplicateRecordStatus status) {
		if (status == null) {
			status = DuplicateRecordStatus.PENDING;
		}
		return Response.ok(duplicateDetectionService.getDuplicatesForEntity(type, id, status)).build();
	}

	@POST
	@Path("/{id}/resolve")
	public Response resolveDuplicate(@PathParam("id") Long id, ResolveDuplicateRequestDto request) {
		duplicateDetectionService.resolveDuplicate(id, request.action, request.keepEntityId);
		return Response.noContent().build();
	}

}
