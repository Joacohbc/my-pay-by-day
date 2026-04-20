package com.mypaybyday.service;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.Base64FileUploadRequestDto;
import com.mypaybyday.dto.EventSummaryDto;
import com.mypaybyday.dto.FileDto;
import com.mypaybyday.dto.FileWithEventDto;
import com.mypaybyday.dto.PagedResponse;
import com.mypaybyday.entity.FileEntity;
import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.common.Page;
import org.eclipse.microprofile.config.inject.ConfigProperty;

@ApplicationScoped
public class FileService {

	private final Messages messages;

	public FileService(Messages messages) {
		this.messages = messages;
	}

	@ConfigProperty(name = "mypaybyday.files.max-size")
	long maxFileSize;

	@Transactional
	public FileDto uploadBase64(Base64FileUploadRequestDto request) throws BusinessException {
		if (request.base64Content() == null || request.base64Content().isBlank()) {
			throw new BusinessException(messages.get(MsgKey.FILE_CONTENT_EMPTY));
		}

		byte[] decodedBytes;
		try {
			String base64 = request.base64Content();
			if (base64.contains(",")) {
				base64 = base64.split(",")[1];
			}
			decodedBytes = Base64.getDecoder().decode(base64);
		} catch (IllegalArgumentException e) {
			throw new BusinessException(messages.get(MsgKey.FILE_CONTENT_INVALID_BASE64));
		}

		return saveFile(request.fileName(), request.mimeType(), decodedBytes);
	}

	private FileDto saveFile(String fileName, String mimeType, byte[] data) throws BusinessException {
		if (data.length > maxFileSize) {
			throw new BusinessException(messages.get(MsgKey.FILE_SIZE_EXCEEDED));
		}

		String hash = computeHash(data);
		FileEntity existing = FileEntity.find("hash", hash).firstResult();
		if (existing != null) {
			return FileDto.from(existing, isOrphan(existing.id));
		}

		FileEntity file = new FileEntity();
		file.fileName = fileName;
		file.mimeType = mimeType;
		file.size = data.length;
		file.data = data;
		file.hash = hash;
		file.persist();

		return FileDto.from(file);
	}

	private String computeHash(byte[] data) {
		try {
			MessageDigest md = MessageDigest.getInstance("SHA-256");
			return HexFormat.of().formatHex(md.digest(data));
		} catch (NoSuchAlgorithmException e) {
			throw new RuntimeException(e);
		}
	}

	public FileDto getFileMetadata(Long id) throws BusinessException {
		FileEntity file = FileEntity.findById(id);
		if (file == null) {
			throw new BusinessException(messages.get(MsgKey.FILE_NOT_FOUND));
		}
		return FileDto.from(file, isOrphan(id));
	}

	public FileEntity getFileContent(Long id) throws BusinessException {
		FileEntity file = FileEntity.findById(id);
		if (file == null) {
			throw new BusinessException(messages.get(MsgKey.FILE_NOT_FOUND));
		}
		return file;
	}

	public String getFileContentAsBase64(Long id) throws BusinessException {
		FileEntity file = getFileContent(id);
		String base64Encoded = Base64.getEncoder().encodeToString(file.data);
		return "data:" + file.mimeType + ";base64," + base64Encoded;
	}

	public PagedResponse<FileWithEventDto> listFiles(int page, int size, Boolean orphaned) {
		PanacheQuery<FileEntity> query;

		if (orphaned != null && orphaned) {
			query = FileEntity.find("id not in (select f.id from FinanceEvent e join e.files f)");
		} else if (orphaned != null && !orphaned) {
			query = FileEntity.find("id in (select f.id from FinanceEvent e join e.files f)");
		} else {
			query = FileEntity.findAll();
		}

		query.page(Page.of(page, size));

		List<FileWithEventDto> dtos = query.list().stream().map(file -> {
			List<FinanceEventEntity> associatedEvents = getAssociatedEvents(file.id);
			boolean isOrphanStatus = associatedEvents.isEmpty();
			List<EventSummaryDto> eventSummaries = associatedEvents.stream()
				.map(EventSummaryDto::from)
				.toList();
			return FileWithEventDto.from(file, isOrphanStatus, eventSummaries);
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
			throw new BusinessException(messages.get(MsgKey.FILE_NOT_FOUND));
		}

		long eventCount = FileEntity.getEntityManager().createQuery(
			"select count(e) from FinanceEvent e join e.files f where f.id = :fileId", Long.class)
			.setParameter("fileId", id)
			.getSingleResult();

		if (eventCount > 0) {
			throw new BusinessException(messages.get(MsgKey.FILE_IN_USE));
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

	@SuppressWarnings("unchecked")
	private List<FinanceEventEntity> getAssociatedEvents(Long fileId) {
		return FileEntity.getEntityManager()
			.createQuery("select e from FinanceEvent e join e.files f where f.id = :fileId")
			.setParameter("fileId", fileId)
			.getResultList();
	}
}
