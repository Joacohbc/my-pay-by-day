package com.mypaybyday.service;

import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.googleapis.auth.oauth2.GoogleCredential;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.FileContent;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.model.File;
import com.google.api.services.drive.model.FileList;
import com.mypaybyday.config.DriveBackupConfig;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;
import java.util.List;

@Slf4j
@ApplicationScoped
public class DriveBackupService {

    private static final String APPLICATION_NAME = "My Pay By Day Backup";
    private static final JsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();
    private static final String BACKUP_FILE_NAME = "mypaybyday-backup.db";

    @Inject
    DriveBackupConfig config;

    @ConfigProperty(name = "quarkus.datasource.jdbc.url")
    String dbUrl;

    public void performBackup() {
        if (!config.enabled()) {
            log.info("Drive backup is disabled. Skipping backup.");
            return;
        }

        log.info("Starting Google Drive backup process...");

        try {
            Drive driveService = createDriveService();
            java.io.File localDbFile = getLocalDbFile();

            if (!localDbFile.exists()) {
                log.error("Local database file not found at path: {}", localDbFile.getAbsolutePath());
                throw new RuntimeException("Database file not found for backup.");
            }

            String folderId = config.folderId().orElse(null);
            String existingFileId = findExistingBackupFileId(driveService, folderId);

            FileContent mediaContent = new FileContent("application/x-sqlite3", localDbFile);

            if (existingFileId != null) {
                // Update existing file
                log.info("Updating existing backup file in Google Drive (ID: {})...", existingFileId);
                File fileMetadata = new File(); // Empty metadata for update, keeps same name
                driveService.files().update(existingFileId, fileMetadata, mediaContent).execute();
                log.info("Backup successfully updated.");
            } else {
                // Create new file
                log.info("Creating new backup file in Google Drive...");
                File fileMetadata = new File();
                fileMetadata.setName(BACKUP_FILE_NAME);
                if (folderId != null && !folderId.isEmpty()) {
                    fileMetadata.setParents(Collections.singletonList(folderId));
                }

                File uploadedFile = driveService.files().create(fileMetadata, mediaContent)
                        .setFields("id")
                        .execute();
                log.info("Backup successfully created with ID: {}", uploadedFile.getId());
            }

        } catch (Exception e) {
            log.error("Failed to perform Google Drive backup", e);
            throw new RuntimeException("Failed to perform Google Drive backup", e);
        }
    }

    private Drive createDriveService() throws GeneralSecurityException, IOException {
        String clientId = config.clientId().orElseThrow(() -> new IllegalArgumentException("Client ID is missing"));
        String clientSecret = config.clientSecret().orElseThrow(() -> new IllegalArgumentException("Client Secret is missing"));
        String refreshToken = config.refreshToken().orElseThrow(() -> new IllegalArgumentException("Refresh Token is missing"));

        NetHttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();

        Credential credential = new GoogleCredential.Builder()
                .setTransport(httpTransport)
                .setJsonFactory(JSON_FACTORY)
                .setClientSecrets(clientId, clientSecret)
                .build()
                .setRefreshToken(refreshToken);

        return new Drive.Builder(httpTransport, JSON_FACTORY, credential)
                .setApplicationName(APPLICATION_NAME)
                .build();
    }

    private java.io.File getLocalDbFile() {
        // Parse "jdbc:sqlite:mypaybyday.db" to extract "mypaybyday.db"
        String prefix = "jdbc:sqlite:";
        String path = dbUrl.startsWith(prefix) ? dbUrl.substring(prefix.length()) : "mypaybyday.db";
        return new java.io.File(path);
    }

    private String findExistingBackupFileId(Drive driveService, String folderId) throws IOException {
        StringBuilder query = new StringBuilder("name = '")
                .append(BACKUP_FILE_NAME)
                .append("' and trashed = false");

        if (folderId != null && !folderId.isEmpty()) {
            query.append(" and '").append(folderId).append("' in parents");
        }

        FileList result = driveService.files().list()
                .setQ(query.toString())
                .setSpaces("drive")
                .setFields("files(id, name)")
                .execute();

        List<File> files = result.getFiles();
        if (files == null || files.isEmpty()) {
            return null;
        } else {
            // If multiple exist, just update the first one
            return files.get(0).getId();
        }
    }
}
