package com.mypaybyday.resource;

import com.mypaybyday.config.DriveBackupConfig;
import com.mypaybyday.service.DriveBackupService;
import jakarta.ws.rs.core.Response;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;

public class BackupResourceTest {

    @Mock
    DriveBackupConfig config;

    @Mock
    DriveBackupService driveBackupService;

    @InjectMocks
    BackupResource backupResource;

    @BeforeEach
    public void setup() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    public void testTriggerBackupDisabled() {
        when(config.enabled()).thenReturn(false);

        Response response = backupResource.triggerBackup();

        assertEquals(400, response.getStatus());
        Map<String, String> entity = (Map<String, String>) response.getEntity();
        assertEquals("Google Drive backup is disabled in configuration.", entity.get("error"));
    }

    @Test
    public void testTriggerBackupEnabledAndSuccessful() {
        when(config.enabled()).thenReturn(true);
        doNothing().when(driveBackupService).performBackup();

        Response response = backupResource.triggerBackup();

        assertEquals(200, response.getStatus());
        Map<String, String> entity = (Map<String, String>) response.getEntity();
        assertEquals("Backup successfully completed to Google Drive.", entity.get("message"));
    }

    @Test
    public void testTriggerBackupEnabledAndFailed() {
        when(config.enabled()).thenReturn(true);
        doThrow(new RuntimeException("Drive API error")).when(driveBackupService).performBackup();

        Response response = backupResource.triggerBackup();

        assertEquals(500, response.getStatus());
        Map<String, String> entity = (Map<String, String>) response.getEntity();
        assertEquals("Backup failed", entity.get("error"));
        assertEquals("Drive API error", entity.get("details"));
    }
}
