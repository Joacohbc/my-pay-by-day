package com.mypaybyday.resource;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import com.mypaybyday.dto.DataTransferDto;
import com.mypaybyday.dto.DataTransferResult;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.DataTransferService;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

@Path("/data")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Data Transfer", description = "Export and import Tags, Categories, Finance Nodes, Tag Groups, and Events")
public class DataTransferResource {

    private final DataTransferService dataTransferService;

    public DataTransferResource(DataTransferService dataTransferService) {
        this.dataTransferService = dataTransferService;
    }

    @GET
    @Path("/export")
    @Operation(summary = "Export all data", description = "Returns all Tags, Categories, Finance Nodes, Tag Groups, and Events as a single ZIP file containing data.json and files/")
    @APIResponse(responseCode = "200", description = "Data exported successfully",
            content = @Content(mediaType = "application/zip", schema = @Schema(implementation = byte[].class)))
    @Produces("application/zip")
    public Response exportAll() {
        return Response.ok(dataTransferService.exportAsZip())
                .header("Content-Disposition", "attachment; filename=\"mypaybyday-export.zip\"")
                .build();
    }

    @POST
    @Path("/import")
    @Operation(summary = "Import data", description = "Imports Tags, Categories, Finance Nodes, Tag Groups, and Events from a previously exported payload. IDs are remapped to avoid conflicts. Events that fail validation are skipped and reported in the response.")
    @APIResponses({
            @APIResponse(responseCode = "200", description = "Import completed. Check skippedEvents for partial failures.",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = DataTransferResult.class))),
            @APIResponse(responseCode = "400", description = "Validation error in tags, categories, or nodes")
    })
    @Consumes("application/zip")
    public Response importAll(java.io.InputStream zipStream) {
        return Response.ok(dataTransferService.importFromZip(zipStream)).build();
    }
}
