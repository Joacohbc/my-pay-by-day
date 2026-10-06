package com.mypaybyday.service.gmail;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.config.GmailIngestionConfig;
import com.mypaybyday.dto.EmailUploadRequestDto;
import com.mypaybyday.dto.FileDto;
import com.mypaybyday.dto.GmailIngestionResultDto;
import com.mypaybyday.dto.GmailMessageDto;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.LanguageContext;
import com.mypaybyday.service.EmailFileService;
import org.jboss.logging.Logger;

/**
 * Turns the spending emails of the user's Gmail account into draft events: each unprocessed message
 * under a source label is stored as an email file, handed to the chatbot's extraction, and only
 * then marked with the processed label. A message that fails anywhere before the label stays
 * unlabelled, so the next run retries it instead of losing it.
 */
@ApplicationScoped
public class GmailIngestionService {

	private static final Logger LOG = Logger.getLogger(GmailIngestionService.class);

	private static final String LABEL_SLUG_SEPARATOR = "-";

	private final GmailClient gmailClient;

	private final ChatbotExtractionClient chatbotExtractionClient;

	private final EmailFileService emailFileService;

	private final GmailIngestionConfig config;

	private final LanguageContext languageContext;

	public GmailIngestionService(GmailClient gmailClient, ChatbotExtractionClient chatbotExtractionClient,
			EmailFileService emailFileService, GmailIngestionConfig config, LanguageContext languageContext) {
		this.gmailClient = gmailClient;
		this.chatbotExtractionClient = chatbotExtractionClient;
		this.emailFileService = emailFileService;
		this.config = config;
		this.languageContext = languageContext;
	}

	public boolean isConfigured() {
		boolean hasSourceLabels = !sourceLabels().isEmpty();
		return gmailClient.hasCredentials() && chatbotExtractionClient.isConfigured() && hasSourceLabels;
	}

	/**
	 * Ingests every unprocessed email found under the configured source labels.
	 *
	 * @return how many emails became drafts and how many failed and will be retried
	 * @throws IllegalStateException when Google rejects the credentials or the processed label does not exist
	 */
	public GmailIngestionResultDto ingest() {
		languageContext.setLang(config.language());
		String processedLabelId = gmailClient.findLabelId(config.processedLabel())
			.orElseThrow(() -> new IllegalStateException("Gmail label not found: " + config.processedLabel()));

		int ingestedCount = 0;
		int failedCount = 0;
		for (String messageId : pendingMessageIds()) {
			boolean hasIngested = ingestMessage(messageId, processedLabelId);
			ingestedCount += hasIngested ? 1 : 0;
			failedCount += hasIngested ? 0 : 1;
		}
		return new GmailIngestionResultDto(ingestedCount, failedCount);
	}

	private List<String> pendingMessageIds() {
		return sourceLabels().stream()
			.flatMap(sourceLabel -> gmailClient.searchMessageIds(pendingQuery(sourceLabel), config.maxMessagesPerLabel()).stream())
			.distinct()
			.toList();
	}

	private String pendingQuery(String sourceLabel) {
		String query = "label:" + labelSlug(sourceLabel) + " -label:" + labelSlug(config.processedLabel()) + " -has:attachment";
		Optional<String> baselineDate = config.baselineDate().filter(date -> !date.isBlank());
		return baselineDate.map(date -> query + " after:" + date).orElse(query);
	}

	private boolean ingestMessage(String messageId, String processedLabelId) {
		try {
			GmailMessageDto message = gmailClient.getMessage(messageId);
			FileDto storedEmail = emailFileService.upload(toUploadRequest(message));
			chatbotExtractionClient.extractDraftFromFile(storedEmail.id());
			gmailClient.addLabel(messageId, processedLabelId);
			LOG.infof("Email ingested | message_id=%s | file_id=%d", messageId, storedEmail.id());
			return true;
		} catch (BusinessException | IllegalStateException exception) {
			LOG.errorf(exception, "Email ingestion failed | message_id=%s", messageId);
			return false;
		}
	}

	private EmailUploadRequestDto toUploadRequest(GmailMessageDto message) {
		return new EmailUploadRequestDto(message.subject(), message.from(), message.to(), message.sentAt(),
			message.htmlBody(), message.textBody());
	}

	private List<String> sourceLabels() {
		return config.sourceLabels().orElse(List.of()).stream()
			.map(String::trim)
			.filter(label -> !label.isEmpty())
			.toList();
	}

	static String labelSlug(String labelName) {
		return labelName.toLowerCase(Locale.ROOT).replaceAll("[\\s/]", LABEL_SLUG_SEPARATOR);
	}
}
