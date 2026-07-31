package com.mypaybyday.dto;

import java.time.LocalDateTime;
import java.util.List;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(description = "Request object for storing an email as a file")
public record EmailUploadRequestDto(
	@Schema(description = "Subject line of the email")
	String subject,

	@Schema(description = "Address the email was sent from", required = true)
	String from,

	@Schema(description = "Addresses the email was sent to")
	List<String> to,

	@Schema(description = "Wall-clock date and time the email was sent")
	LocalDateTime messageDate,

	@Schema(description = "HTML part of the email, converted to Markdown before being stored")
	String htmlBody,

	@Schema(description = "Plain-text part of the email, stored as received")
	String textBody
) {}
