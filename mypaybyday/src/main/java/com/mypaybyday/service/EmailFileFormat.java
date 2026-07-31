package com.mypaybyday.service;

import java.time.format.DateTimeFormatter;
import java.util.List;
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

	private static final DateTimeFormatter HEADER_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

	private static final String UNKNOWN_HEADER_VALUE = "unknown";

	private EmailFileFormat() {
	}

	public static boolean isEmailFile(String mimeType) {
		return MIME_TYPE.equals(mimeType);
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
		return email.messageDate() == null ? UNKNOWN_HEADER_VALUE : HEADER_DATE_FORMAT.format(email.messageDate());
	}
}
