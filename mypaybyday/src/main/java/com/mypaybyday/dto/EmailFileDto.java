package com.mypaybyday.dto;

import java.time.LocalDateTime;
import java.util.List;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * The JSON document persisted as the content of an email file. It is what the client reads back to
 * render the stored file as an email instead of as raw JSON.
 */
@Schema(description = "Email stored as a file: the JSON document that makes up the file's content")
public record EmailFileDto(
	@Schema(description = "Subject line of the email")
	String subject,

	@Schema(description = "Address the email was sent from")
	String from,

	@Schema(description = "Addresses the email was sent to")
	List<String> to,

	@Schema(description = "Wall-clock date and time the email was sent")
	LocalDateTime messageDate,

	@Schema(description = "Body of the email as Markdown, converted from its HTML part")
	String markdownBody,

	@Schema(description = "Plain-text body of the email as it was received")
	String textBody
) {}
