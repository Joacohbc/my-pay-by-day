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
import io.quarkus.logging.Log;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.panache.common.Page;
import org.eclipse.microprofile.config.inject.ConfigProperty;

@ApplicationScoped
public class FileService {

	private final Messages messages;

	private final MarkItDownClient markItDownClient;

	public FileService(Messages messages, MarkItDownClient markItDownClient) {
		this.messages = messages;
		this.markItDownClient = markItDownClient;
	}

	@ConfigProperty(name = "mypaybyday.files.max-size")
	long maxFileSize;

	public FileDto uploadBase64(Base64FileUploadRequestDto request) throws BusinessException {
		if (request.base64Content() == null || request.base64Content().isBlank()) {
			throw messages.reject(MsgKey.FILE_CONTENT_EMPTY);
		}

		byte[] decodedBytes;
		try {
			String base64 = request.base64Content();
			if (base64.contains(",")) {
				base64 = base64.split(",")[1];
			}
			decodedBytes = Base64.getDecoder().decode(base64);
		} catch (IllegalArgumentException e) {
			throw messages.reject(MsgKey.FILE_CONTENT_INVALID_BASE64);
		}

		return saveFile(request.fileName(), request.mimeType(), decodedBytes);
	}

	private FileDto saveFile(String fileName, String mimeType, byte[] data) throws BusinessException {
		if (data.length > maxFileSize) {
			throw messages.reject(MsgKey.FILE_SIZE_EXCEEDED);
		}

		String hash = computeHash(data);
		FileDto deduplicated = findByHash(hash);
		if (deduplicated != null) {
			return deduplicated;
		}

		String markdown = convertToMarkdown(fileName, mimeType, data);
		return QuarkusTransaction.requiringNew().call(() -> persistFile(fileName, mimeType, data, hash, markdown));
	}

	private FileDto findByHash(String hash) {
		FileEntity existing = FileEntity.find("hash", hash).firstResult();
		if (existing == null) {
			return null;
		}
		return FileDto.from(existing, isOrphan(existing.id));
	}

	private FileDto persistFile(String fileName, String mimeType, byte[] data, String hash, String markdown) {
		FileEntity file = new FileEntity();
		file.fileName = fileName;
		file.mimeType = mimeType;
		file.size = data.length;
		file.data = data;
		file.hash = hash;
		file.markdownContent = markdown;
		file.persist();

		Log.infof("Stored file id=%d size=%d mime=%s", file.id, file.size, file.mimeType);
		return FileDto.from(file);
	}

	private String convertToMarkdown(String fileName, String mimeType, byte[] data) {
		if (!markItDownClient.isConvertible(mimeType)) {
			return null;
		}
		return markItDownClient.convert(data, mimeType, fileName).orElse(null);
	}

	/**
	 * Returns the persisted Markdown content of a file, converting it on demand when a previous
	 * conversion attempt failed (e.g. the sidecar was down at upload time). The lazy retry runs
	 * inside the read transaction — the sidecar call briefly holds the single-connection pool,
	 * an accepted tradeoff for this rare recovery path.
	 *
	 * @param id the file identifier
	 * @return the Markdown text, or {@code null} when the file is not convertible or the sidecar is unavailable
	 * @throws BusinessException when the file does not exist
	 */
	@Transactional
	public String getMarkdownContent(Long id) throws BusinessException {
		FileEntity file = getFileContent(id);
		if (file.markdownContent != null) {
			return file.markdownContent;
		}
		if (!markItDownClient.isConvertible(file.mimeType)) {
			return null;
		}

		String markdown = markItDownClient.convert(file.data, file.mimeType, file.fileName).orElse(null);
		if (markdown != null) {
			file.markdownContent = markdown;
		}
		return markdown;
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
			throw messages.reject(MsgKey.FILE_NOT_FOUND);
		}
		return FileDto.from(file, isOrphan(id));
	}

	public FileEntity getFileContent(Long id) throws BusinessException {
		FileEntity file = FileEntity.findById(id);
		if (file == null) {
			throw messages.reject(MsgKey.FILE_NOT_FOUND);
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
			throw messages.reject(MsgKey.FILE_NOT_FOUND);
		}

		long eventCount = FileEntity.getEntityManager().createQuery(
			"select count(e) from FinanceEvent e join e.files f where f.id = :fileId", Long.class)
			.setParameter("fileId", id)
			.getSingleResult();

		if (eventCount > 0) {
			Log.warnf("Delete rejected: file id=%d is used by %d events", id, eventCount);
			throw messages.reject(MsgKey.FILE_IN_USE);
		}

		file.delete();
		Log.infof("Deleted file id=%d", id);
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
