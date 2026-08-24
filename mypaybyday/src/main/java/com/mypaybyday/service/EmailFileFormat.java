package com.mypaybyday.service;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

import com.mypaybyday.dto.EmailFileDto;

/**
 * The storage format of an email held as a file: its MIME type, the name such a file gets, and the
 * Markdown rendering persisted alongside it so every reader that already understands Markdown files
 * (the preview, the AI attachment pipeline) reads an email without knowing this format exists.
 */
public final class EmailFileFormat {

	public static final String MIME_TYPE = "application/vnd.mypaybyday.email+json";

	public static final String FILE_EXTENSION = ".email";

	private static final String UNTITLED_SUBJECT_FILE_NAME = "email";

	private static final int MAX_SUBJECT_FILE_NAME_LENGTH = 80;

	private static final Pattern FILE_NAME_UNSAFE_CHARS = Pattern.compile("[^\\p{L}\\p{N} _-]+");

	/**
	 * Carries the offset the stored wall-clock time belongs to. Without it the AI, grounded in the
	 * reader's own timezone, reads a server-time header as local time and reports the wrong day.
	 */
	private static final DateTimeFormatter HEADER_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm 'UTC'xxx");

	private static final String UNKNOWN_HEADER_VALUE = "unknown";

	private EmailFileFormat() {
	}

	public static boolean isEmailFile(String mimeType) {
		return MIME_TYPE.equals(mimeType);
	}

	/**
	 * Reads the date an email was sent into the server wall-clock time every business date is stored
	 * in. A value carrying an offset (what the email's own Date header has) is converted; one without
	 * is taken as already being server time.
	 *
	 * @param isoMessageDate the date as received, ISO-8601, with or without an offset
	 * @return the date in server time, or empty when the value is not a date
	 */
	public static Optional<LocalDateTime> parseMessageDate(String isoMessageDate) {
		try {
			return Optional.of(OffsetDateTime.parse(isoMessageDate).atZoneSameInstant(ZoneId.systemDefault()).toLocalDateTime());
		} catch (DateTimeParseException withoutOffset) {
			return parseServerLocalDate(isoMessageDate);
		}
	}

	private static Optional<LocalDateTime> parseServerLocalDate(String isoMessageDate) {
		try {
			return Optional.of(LocalDateTime.parse(isoMessageDate));
		} catch (DateTimeParseException notADate) {
			return Optional.empty();
		}
	}

	/**
	 * Derives the stored file name from the email subject. The {@code .email} extension is what the
	 * type label resolves to {@code EMAIL} and what tells a reader browsing the file list that the
	 * JSON inside is an email.
	 *
	 * @param subject the email subject; may be {@code null} or blank
	 * @return a file name safe to display and to download, never {@code null}
	 */
	public static String fileNameOf(String subject) {
		if (subject == null || subject.isBlank()) {
			return UNTITLED_SUBJECT_FILE_NAME + FILE_EXTENSION;
		}
		String safeSubject = FILE_NAME_UNSAFE_CHARS.matcher(subject).replaceAll(" ").replaceAll("\\s+", " ").trim();
		if (safeSubject.isEmpty()) {
			return UNTITLED_SUBJECT_FILE_NAME + FILE_EXTENSION;
		}
		if (safeSubject.length() > MAX_SUBJECT_FILE_NAME_LENGTH) {
			safeSubject = safeSubject.substring(0, MAX_SUBJECT_FILE_NAME_LENGTH).trim();
		}
		return safeSubject + FILE_EXTENSION;
	}

	/**
	 * Renders the email as the Markdown document persisted on the file, so its headers and body reach
	 * the AI and the generic Markdown preview as one readable text.
	 *
	 * @param email the stored email
	 * @return the Markdown rendering, never {@code null}
	 */
	public static String renderMarkdown(EmailFileDto email) {
		StringBuilder markdown = new StringBuilder();
		markdown.append("# ").append(headerValueOf(email.subject())).append("\n\n");
		markdown.append("**From:** ").append(headerValueOf(email.from())).append("  \n");
		markdown.append("**To:** ").append(recipientsOf(email.to())).append("  \n");
		markdown.append("**Date:** ").append(messageDateOf(email)).append("\n\n");
		markdown.append("---\n\n");
		markdown.append(bodyOf(email));
		return markdown.toString();
	}

	/**
	 * Returns the body to show for an email, preferring the Markdown converted from its HTML part and
	 * falling back to the plain-text part.
	 *
	 * @param email the stored email
	 * @return the body text, or an empty string when the email carries neither part
	 */
	public static String bodyOf(EmailFileDto email) {
		if (email.markdownBody() != null && !email.markdownBody().isBlank()) {
			return email.markdownBody().trim();
		}
		if (email.textBody() != null && !email.textBody().isBlank()) {
			return email.textBody().trim();
		}
		return "";
	}

	private static String headerValueOf(String value) {
		return value == null || value.isBlank() ? UNKNOWN_HEADER_VALUE : value;
	}

	private static String recipientsOf(List<String> recipients) {
		if (recipients == null || recipients.isEmpty()) {
			return UNKNOWN_HEADER_VALUE;
		}
		return String.join(", ", recipients);
	}

	private static String messageDateOf(EmailFileDto email) {
		if (email.messageDate() == null) {
			return UNKNOWN_HEADER_VALUE;
		}
		return HEADER_DATE_FORMAT.format(email.messageDate().atZone(ZoneId.systemDefault()));
	}
}
