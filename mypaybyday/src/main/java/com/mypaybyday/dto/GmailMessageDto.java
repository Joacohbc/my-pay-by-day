package com.mypaybyday.dto;

import java.time.LocalDateTime;
import java.util.List;

public record GmailMessageDto(
	String id,
	String subject,
	String from,
	List<String> to,
	LocalDateTime sentAt,
	String htmlBody,
	String textBody
) {}
