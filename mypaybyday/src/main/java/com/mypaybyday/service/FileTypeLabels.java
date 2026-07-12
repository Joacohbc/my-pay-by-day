package com.mypaybyday.service;

import java.util.Locale;
import java.util.Map;

/**
 * Authoritative mapping from a file's name and MIME type to a short, user-facing type label
 * (e.g. {@code PDF}, {@code DOCX}, {@code PNG}). The filename extension wins when present and
 * short enough; otherwise the MIME type is resolved through a known-label map, falling back to
 * the uppercased MIME subtype.
 */
public final class FileTypeLabels {

	private static final int MAX_EXTENSION_LENGTH = 5;

	private static final String UNKNOWN_TYPE_LABEL = "FILE";

	private static final Map<String, String> MIME_TYPE_LABELS = Map.ofEntries(
		Map.entry("application/pdf", "PDF"),
		Map.entry("application/json", "JSON"),
		Map.entry("application/msword", "DOC"),
		Map.entry("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "DOCX"),
		Map.entry("application/vnd.ms-excel", "XLS"),
		Map.entry("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "XLSX"),
		Map.entry("application/vnd.ms-powerpoint", "PPT"),
		Map.entry("application/vnd.openxmlformats-officedocument.presentationml.presentation", "PPTX"),
		Map.entry("application/epub+zip", "EPUB"),
		Map.entry("application/zip", "ZIP"),
		Map.entry("application/xml", "XML"),
		Map.entry("text/plain", "TXT"),
		Map.entry("text/csv", "CSV"),
		Map.entry("text/markdown", "MD"),
		Map.entry("text/x-markdown", "MD"),
		Map.entry("text/html", "HTML"),
		Map.entry("text/xml", "XML"),
		Map.entry("image/png", "PNG"),
		Map.entry("image/jpeg", "JPG"),
		Map.entry("image/gif", "GIF"),
		Map.entry("image/webp", "WEBP"),
		Map.entry("image/svg+xml", "SVG"),
		Map.entry("audio/mpeg", "MP3"),
		Map.entry("audio/wav", "WAV"),
		Map.entry("audio/ogg", "OGG"),
		Map.entry("video/mp4", "MP4"),
		Map.entry("video/webm", "WEBM")
	);

	private FileTypeLabels() {
	}

	/**
	 * Resolves the short type label for a file.
	 *
	 * @param fileName the file name, possibly containing an extension; may be {@code null}
	 * @param mimeType the full MIME type reported at upload; may be {@code null}
	 * @return a short uppercase label such as {@code PDF} or {@code DOCX}, never {@code null}
	 */
	public static String labelFor(String fileName, String mimeType) {
		String extensionLabel = extensionLabelOf(fileName);
		if (extensionLabel != null) {
			return extensionLabel;
		}
		return mimeLabelOf(mimeType);
	}

	private static String extensionLabelOf(String fileName) {
		if (fileName == null) {
			return null;
		}
		int lastDot = fileName.lastIndexOf('.');
		boolean hasUsableExtension = lastDot > 0 && lastDot < fileName.length() - 1;
		if (!hasUsableExtension) {
			return null;
		}
		String extension = fileName.substring(lastDot + 1);
		if (extension.length() > MAX_EXTENSION_LENGTH) {
			return null;
		}
		return extension.toUpperCase(Locale.ROOT);
	}

	private static String mimeLabelOf(String mimeType) {
		if (mimeType == null || mimeType.isBlank()) {
			return UNKNOWN_TYPE_LABEL;
		}
		String knownLabel = MIME_TYPE_LABELS.get(mimeType);
		if (knownLabel != null) {
			return knownLabel;
		}
		int slash = mimeType.indexOf('/');
		String subtype = slash >= 0 && slash < mimeType.length() - 1 ? mimeType.substring(slash + 1) : mimeType;
		return subtype.toUpperCase(Locale.ROOT);
	}
}
