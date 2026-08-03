package com.mypaybyday.service;

import java.nio.charset.StandardCharsets;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mypaybyday.dto.EmailFileDto;
import com.mypaybyday.dto.EmailUploadRequestDto;
import com.mypaybyday.dto.FileDto;
import com.mypaybyday.entity.FileEntity;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.validation.EmailFileValidator;
import io.quarkus.logging.Log;

/**
 * Stores emails as files. An email is kept as a JSON document — subject, sender, recipients, date
 * and body — so clients can render it as an email, while the Markdown persisted next to it keeps
 * the email readable through the same path as every other attached document.
 */
@ApplicationScoped
public class EmailFileService {

	private static final String HTML_MIME_TYPE = "text/html";

	private static final String HTML_CONVERSION_FILE_NAME = "email.html";

	private final FileService fileService;

	private final MarkItDownClient markItDownClient;

	private final EmailFileValidator emailFileValidator;

	private final ObjectMapper objectMapper;

	private final Messages messages;

	public EmailFileService(FileService fileService, MarkItDownClient markItDownClient,
			EmailFileValidator emailFileValidator, ObjectMapper objectMapper, Messages messages) {
		this.fileService = fileService;
		this.markItDownClient = markItDownClient;
		this.emailFileValidator = emailFileValidator;
		this.objectMapper = objectMapper;
		this.messages = messages;
	}

	/**
	 * Converts the email's HTML part to Markdown and stores the whole email as a file.
	 *
	 * @param request the email to store
	 * @return the stored file
	 * @throws BusinessException when the email is invalid, exceeds the maximum file size, or its HTML
	 *                           body could not be converted and no plain-text body was supplied
	 */
	public FileDto upload(EmailUploadRequestDto request) throws BusinessException {
		EmailUploadRequestDto sanitized = emailFileValidator.validate(request);
		EmailFileDto email = new EmailFileDto(
			sanitized.subject(),
			sanitized.from(),
			sanitized.to(),
			sanitized.messageDate(),
			markdownBodyOf(sanitized),
			sanitized.textBody()
		);

		FileDto stored = fileService.storeConvertedFile(
			EmailFileFormat.fileNameOf(email.subject()),
			EmailFileFormat.MIME_TYPE,
			serialize(email),
			EmailFileFormat.renderMarkdown(email)
		);
		Log.infof("Stored email as file id=%d subject='%s'", stored.id(), email.subject());
		return stored;
	}

	/**
	 * Reads back a stored email so it can be rendered as an email rather than as raw JSON.
	 *
	 * @param id the file identifier
	 * @return the stored email
	 * @throws BusinessException when the file does not exist, is not an email, or its content is unreadable
	 */
	@Transactional
	public EmailFileDto getEmail(Long id) throws BusinessException {
		FileEntity file = fileService.getFileContent(id);
		if (!EmailFileFormat.isEmailFile(file.mimeType)) {
			throw messages.reject(MsgKey.FILE_EMAIL_INVALID_TYPE);
		}
		return deserialize(file.data);
	}

	private String markdownBodyOf(EmailUploadRequestDto request) throws BusinessException {
		if (request.htmlBody() == null || request.htmlBody().isBlank()) {
			return null;
		}

		byte[] html = request.htmlBody().getBytes(StandardCharsets.UTF_8);
		String markdown = markItDownClient.convert(html, HTML_MIME_TYPE, HTML_CONVERSION_FILE_NAME).orElse(null);
		boolean canFallBackToText = request.textBody() != null && !request.textBody().isBlank();
		if (markdown == null && !canFallBackToText) {
			throw messages.reject(MsgKey.FILE_EMAIL_CONVERSION_UNAVAILABLE);
		}
		return markdown;
	}

	private byte[] serialize(EmailFileDto email) throws BusinessException {
		try {
			return objectMapper.writeValueAsBytes(email);
		} catch (JsonProcessingException e) {
			throw messages.reject(MsgKey.FILE_EMAIL_CONTENT_INVALID);
		}
	}

	private EmailFileDto deserialize(byte[] content) throws BusinessException {
		try {
			return objectMapper.readValue(content, EmailFileDto.class);
		} catch (Exception e) {
			Log.warnf("Stored email file could not be parsed: %s", e.getMessage());
			throw messages.reject(MsgKey.FILE_EMAIL_CONTENT_INVALID);
		}
	}
}
