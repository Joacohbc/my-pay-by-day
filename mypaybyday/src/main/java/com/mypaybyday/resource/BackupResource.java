package com.mypaybyday.resource;

import com.mypaybyday.config.DriveBackupConfig;
import com.mypaybyday.service.DriveBackupService;
import jakarta.inject.Inject;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import java.util.Map;

@Path("/api/backup")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Backup", description = "Endpoints for managing database backups")
public class BackupResource {

    @Inject
    DriveBackupService driveBackupService;

    @Inject
    DriveBackupConfig config;

    @POST
    @Operation(summary = "Trigger a Google Drive backup manually")
    @APIResponse(responseCode = "200", description = "Backup successful")
    @APIResponse(responseCode = "400", description = "Backup disabled")
    @APIResponse(responseCode = "500", description = "Internal server error during backup")
    public Response triggerBackup() {
        if (!config.enabled()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", "Google Drive backup is disabled in configuration."))
                    .build();
        }

        try {
            driveBackupService.performBackup();
            return Response.ok(Map.of("message", "Backup successfully completed to Google Drive.")).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "Backup failed", "details", e.getMessage()))
                    .build();
        }
    }
}
