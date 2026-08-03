package com.mypaybyday.validation;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.dto.EmailUploadRequestDto;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;

/**
 * Validates an incoming email before it is stored as a file. Bodies are deliberately left
 * unvalidated: they are file content, sized by the file-size limit like any other upload, and an
 * email body legitimately exceeds the text limits that apply to names and descriptions.
 */
@ApplicationScoped
public class EmailFileValidator {

	private final RegexValidator regexValidator;

	private final Messages messages;

	public EmailFileValidator(RegexValidator regexValidator, Messages messages) {
		this.regexValidator = regexValidator;
		this.messages = messages;
	}

	/**
	 * Validates the request and returns it with its header fields sanitized.
	 *
	 * @param email the email to store
	 * @return the same email with sanitized subject, sender and recipients
	 * @throws BusinessException when the sender is missing, no body was supplied, or a header field
	 *                           breaks the shared text rules
	 */
	public EmailUploadRequestDto validate(EmailUploadRequestDto email) throws BusinessException {
		String sender = regexValidator.sanitize(email.from());
		if (sender == null || sender.isBlank()) {
			throw messages.reject(MsgKey.FILE_EMAIL_FROM_REQUIRED);
		}

		boolean hasBody = isPresent(email.htmlBody()) || isPresent(email.textBody());
		if (!hasBody) {
			throw messages.reject(MsgKey.FILE_EMAIL_BODY_EMPTY);
		}

		String subject = regexValidator.sanitize(email.subject());
		List<String> recipients = sanitizedRecipients(email.to());

		regexValidator.validateText(subject, RegexValidator.SHORT_MAX_LENGTH);
		regexValidator.validateText(sender, RegexValidator.SHORT_MAX_LENGTH);
		for (String recipient : recipients) {
			regexValidator.validateText(recipient, RegexValidator.SHORT_MAX_LENGTH);
		}

		return new EmailUploadRequestDto(subject, sender, recipients, email.messageDate(), email.htmlBody(), email.textBody());
	}

	private List<String> sanitizedRecipients(List<String> recipients) {
		if (recipients == null) {
			return List.of();
		}
		return recipients.stream()
			.map(regexValidator::sanitize)
			.filter(EmailFileValidator::isPresent)
			.toList();
	}

	private static boolean isPresent(String value) {
		return value != null && !value.isBlank();
	}
}
