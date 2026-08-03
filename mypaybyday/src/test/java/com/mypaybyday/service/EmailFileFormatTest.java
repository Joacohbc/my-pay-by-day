package com.mypaybyday.service;

import java.time.LocalDateTime;
import java.util.List;

import com.mypaybyday.dto.EmailFileDto;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class EmailFileFormatTest {

	private static EmailFileDto emailWith(String subject, String markdownBody, String textBody) {
		return new EmailFileDto(
			subject,
			"bank@example.com",
			List.of("me@example.com"),
			LocalDateTime.of(2026, 7, 31, 9, 5),
			markdownBody,
			textBody
		);
	}

	@Test
	void fileNameKeepsSubjectAndAddsEmailExtension() {
		assertEquals("Payment received.email", EmailFileFormat.fileNameOf("Payment received"));
	}

	@Test
	void fileNameStripsCharactersThatCannotBeStoredOrDownloaded() {
		assertEquals("Recibo 12 2026.email", EmailFileFormat.fileNameOf("Recibo #12/2026"));
	}

	@Test
	void fileNameFallsBackWhenSubjectIsMissingOrUnusable() {
		assertEquals("email.email", EmailFileFormat.fileNameOf(null));
		assertEquals("email.email", EmailFileFormat.fileNameOf("   "));
		assertEquals("email.email", EmailFileFormat.fileNameOf("///"));
	}

	@Test
	void fileNameIsTruncatedForVeryLongSubjects() {
		String fileName = EmailFileFormat.fileNameOf("a".repeat(200));
		assertEquals(80 + EmailFileFormat.FILE_EXTENSION.length(), fileName.length());
		assertTrue(fileName.endsWith(EmailFileFormat.FILE_EXTENSION));
	}

	@Test
	void markdownCarriesEveryHeaderAndTheBody() {
		String markdown = EmailFileFormat.renderMarkdown(emailWith("Payment received", "You **paid** $10", null));

		String hardLineBreak = "  \n";
		assertEquals("# Payment received\n\n"
			+ "**From:** bank@example.com" + hardLineBreak
			+ "**To:** me@example.com" + hardLineBreak
			+ "**Date:** 2026-07-31 09:05\n\n"
			+ "---\n\n"
			+ "You **paid** $10", markdown);
	}

	@Test
	void markdownFallsBackToThePlainTextBodyWhenThereIsNoHtmlConversion() {
		String markdown = EmailFileFormat.renderMarkdown(emailWith("Payment received", null, "You paid $10"));

		assertTrue(markdown.endsWith("You paid $10"));
	}

	@Test
	void markdownReportsMissingHeadersAsUnknown() {
		EmailFileDto email = new EmailFileDto(null, null, List.of(), null, "body", null);

		String markdown = EmailFileFormat.renderMarkdown(email);

		assertTrue(markdown.contains("# unknown"));
		assertTrue(markdown.contains("**From:** unknown"));
		assertTrue(markdown.contains("**To:** unknown"));
		assertTrue(markdown.contains("**Date:** unknown"));
	}

	@Test
	void onlyTheEmailMimeTypeIsRecognisedAsAnEmail() {
		assertTrue(EmailFileFormat.isEmailFile(EmailFileFormat.MIME_TYPE));
		assertFalse(EmailFileFormat.isEmailFile("application/json"));
		assertFalse(EmailFileFormat.isEmailFile(null));
	}

	@Test
	void emailFilesAreLabelledAsEmailWhateverTheFileNameIs() {
		assertEquals("EMAIL", FileTypeLabels.labelFor("Payment received.email", EmailFileFormat.MIME_TYPE));
		assertEquals("EMAIL", FileTypeLabels.labelFor(null, EmailFileFormat.MIME_TYPE));
	}
}
