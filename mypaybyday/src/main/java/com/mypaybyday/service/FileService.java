package com.mypaybyday.service;

import com.mypaybyday.dto.Base64FileUploadRequestDto;
import com.mypaybyday.dto.FileDto;
import com.mypaybyday.dto.PagedResponse;
import com.mypaybyday.entity.FileEntity;
import com.mypaybyday.exception.BusinessException;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.common.Page;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import java.util.Base64;
import java.util.List;
import org.eclipse.microprofile.config.inject.ConfigProperty;

@ApplicationScoped
public class FileService {

    @ConfigProperty(name = "mypaybyday.files.max-size")
    long maxFileSize;

    @Transactional
    public FileDto uploadBase64(Base64FileUploadRequestDto request) throws BusinessException {
        if (request.base64Content() == null || request.base64Content().isBlank()) {
            throw new BusinessException("file.content.empty");
        }

        byte[] decodedBytes;
        try {
            String base64 = request.base64Content();
            if (base64.contains(",")) {
                base64 = base64.split(",")[1];
            }
            decodedBytes = Base64.getDecoder().decode(base64);
        } catch (IllegalArgumentException e) {
            throw new BusinessException("file.content.invalid.base64");
        }

        return saveFile(request.fileName(), request.mimeType(), decodedBytes);
    }

    private FileDto saveFile(String fileName, String mimeType, byte[] data) throws BusinessException {
        if (data.length > maxFileSize) {
            throw new BusinessException("file.size.exceeded");
        }

        FileEntity file = new FileEntity();
        file.fileName = fileName;
        file.mimeType = mimeType;
        file.size = data.length;
        file.data = data;
        file.persist();

        return FileDto.from(file);
    }

    public FileDto getFileMetadata(Long id) throws BusinessException {
        FileEntity file = FileEntity.findById(id);
        if (file == null) {
            throw new BusinessException("file.not.found");
        }
        return FileDto.from(file, isOrphan(id));
    }

    public FileEntity getFileContent(Long id) throws BusinessException {
        FileEntity file = FileEntity.findById(id);
        if (file == null) {
            throw new BusinessException("file.not.found");
        }
        return file;
    }

    public PagedResponse<FileDto> listFiles(int page, int size, Boolean orphaned) {
        PanacheQuery<FileEntity> query;

        if (orphaned != null && orphaned) {
            query = FileEntity.find("id not in (select f.id from FinanceEvent e join e.files f)");
        } else if (orphaned != null && !orphaned) {
            query = FileEntity.find("id in (select f.id from FinanceEvent e join e.files f)");
        } else {
            query = FileEntity.findAll();
        }

        query.page(Page.of(page, size));

        List<FileDto> dtos = query.list().stream().map(file -> {
            boolean isOprhanStatus = isOrphan(file.id);
            return FileDto.from(file, isOprhanStatus);
        }).toList();

        return new PagedResponse<>(
            dtos,
            page,
            size,
            query.count(),
            query.pageCount()
        );
    }

    @Transactional
    public void deleteFile(Long id) throws BusinessException {
        FileEntity file = FileEntity.findById(id);
        if (file == null) {
            throw new BusinessException("file.not.found");
        }

        long eventCount = FileEntity.getEntityManager().createQuery(
            "select count(e) from FinanceEvent e join e.files f where f.id = :fileId", Long.class)
            .setParameter("fileId", id)
            .getSingleResult();

        if (eventCount > 0) {
            throw new BusinessException("file.in.use");
        }

        file.delete();
    }

    private boolean isOrphan(Long fileId) {
        long eventCount = FileEntity.getEntityManager().createQuery(
            "select count(e) from FinanceEvent e join e.files f where f.id = :fileId", Long.class)
            .setParameter("fileId", fileId)
            .getSingleResult();
        return eventCount == 0;
    }
}
