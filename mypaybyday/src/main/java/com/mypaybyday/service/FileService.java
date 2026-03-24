package com.mypaybyday.service;

import com.mypaybyday.dto.FileDTO;
import com.mypaybyday.entity.StoredFile;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.repository.StoredFileRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.io.IOException;
import java.io.InputStream;
import org.jboss.resteasy.reactive.multipart.FileUpload;

@ApplicationScoped
public class FileService {

    @Inject
    StoredFileRepository storedFileRepository;

    @Transactional
    public FileDTO uploadFile(FileUpload fileUpload) {
        if (fileUpload == null) {
            throw new BusinessException("File is required");
        }

        StoredFile storedFile = new StoredFile();
        storedFile.setFileName(fileUpload.fileName());
        storedFile.setContentType(fileUpload.contentType());

        try {
            byte[] fileBytes = java.nio.file.Files.readAllBytes(fileUpload.filePath());
            storedFile.setData(fileBytes);
        } catch (IOException e) {
            throw new BusinessException("Error reading file data");
        }

        storedFileRepository.persist(storedFile);

        return FileDTO.from(storedFile);
    }

    public StoredFile getFile(Long id) {
        StoredFile storedFile = storedFileRepository.findById(id);
        if (storedFile == null) {
            throw new BusinessException("File not found");
        }
        return storedFile;
    }
}
