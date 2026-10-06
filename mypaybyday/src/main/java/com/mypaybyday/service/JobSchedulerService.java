package com.mypaybyday.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.context.control.ActivateRequestContext;
import jakarta.enterprise.event.ObservesAsync;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.ConversionBackfillBatchDto;
import com.mypaybyday.dto.ConversionRecalculationBatchDto;
import com.mypaybyday.dto.ConversionRecalculationDto;
import com.mypaybyday.dto.ExchangeRateDto;
import com.mypaybyday.dto.GmailIngestionResultDto;
import com.mypaybyday.entity.SystemJobEntity;
import com.mypaybyday.enums.JobCategory;
import com.mypaybyday.enums.JobStatus;
import com.mypaybyday.filter.CorrelationIdFilter;
import com.mypaybyday.i18n.LanguageContext;
import com.mypaybyday.repository.SystemJobRepository;
import com.mypaybyday.service.duplicate.DuplicateDetectionEvent;
import com.mypaybyday.service.duplicate.DuplicateDetectionService;
import com.mypaybyday.service.currency.ConversionRecalculationService;
import com.mypaybyday.service.currency.ExchangeRateRefreshScheduleService;
import com.mypaybyday.service.currency.ExchangeRateService;
import com.mypaybyday.service.event.TransactionConversionService;
import com.mypaybyday.service.gmail.GmailIngestionService;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.scheduler.Scheduled;
import org.jboss.logging.Logger;
import org.jboss.logging.MDC;

@ApplicationScoped
public class JobSchedulerService {

	private static final Logger LOG = Logger.getLogger(JobSchedulerService.class);

	private static final String JOB_SUBSCRIPTION_PROCESSOR = "subscription-processor";
	private static final String JOB_DUPLICATE_DETECTION = "duplicate-detection";
	private static final String JOB_CURRENCY_CONVERSION_BACKFILL = "currency-conversion-backfill";
	private static final String JOB_CURRENCY_CONVERSION_RECALCULATION = "currency-conversion-recalculation";
	private static final String JOB_EXCHANGE_RATE_REFRESH = "exchange-rate-refresh";
	private static final String JOB_GMAIL_INGESTION = "gmail-ingestion";

	/** The job message column is a VARCHAR(255). */
	private static final int JOB_MESSAGE_MAX_LENGTH = 255;

	/** The run reached the end of its queue; individual item failures are counted separately. */
	private static final String JOB_STATUS_COMPLETED = "completed";

	/** The run aborted before processing its queue, so its counts say nothing about the backlog. */
	private static final String JOB_STATUS_SKIPPED = "skipped";

	/**
	 * Closing line of every scheduled run, in the same {@code key=value} shape as the request log so
	 * Alloy parses it with one regex. This is what makes job success rate and duration queryable —
	 * prose log lines are not.
	 *
	 * <p>The key is {@code job_name} rather than {@code job} because Alloy already publishes a
	 * {@code job} stream label for every container; reusing the name would collide in Loki.
	 */
	private void logJobSummary(String jobName, String status, int processed, int failed, long startedAtMillis) {
		LOG.infof("job finished | job_name=%s | job_status=%s | processed=%d | failed=%d | time=%dms",
				jobName, status, processed, failed, System.currentTimeMillis() - startedAtMillis);
	}

	/**
	 * Background jobs run outside any HTTP request, so the request-scoped MDC is empty. Stamp a
	 * synthetic {@code job-<uuid>} correlation id (and a {@code source}) so their log lines are
	 * grouped and never render an empty {@code [req=]}.
	 */
	private void withJobCorrelation(String source, Runnable body) {
		MDC.put(CorrelationIdFilter.MDC_KEY, "job-" + UUID.randomUUID());
		MDC.put(CorrelationIdFilter.MDC_SOURCE_KEY, source);
		try {
			body.run();
		} finally {
			MDC.remove(CorrelationIdFilter.MDC_KEY);
			MDC.remove(CorrelationIdFilter.MDC_SOURCE_KEY);
		}
	}

	private final SystemJobRepository systemJobRepository;
	private final SubscriptionService subscriptionService;
	private final PaymentPlanService paymentPlanService;
	private final DuplicateDetectionService duplicateDetectionService;
	private final TransactionConversionService transactionConversionService;
	private final ConversionRecalculationService conversionRecalculationService;
	private final ExchangeRateRefreshScheduleService exchangeRateRefreshScheduleService;
	private final ExchangeRateService exchangeRateService;
	private final GmailIngestionService gmailIngestionService;
	private final LanguageContext languageContext;

	public JobSchedulerService(SystemJobRepository systemJobRepository, SubscriptionService subscriptionService, PaymentPlanService paymentPlanService, DuplicateDetectionService duplicateDetectionService, TransactionConversionService transactionConversionService, ConversionRecalculationService conversionRecalculationService, ExchangeRateRefreshScheduleService exchangeRateRefreshScheduleService, ExchangeRateService exchangeRateService, GmailIngestionService gmailIngestionService, LanguageContext languageContext) {
		this.systemJobRepository = systemJobRepository;
		this.subscriptionService = subscriptionService;
		this.paymentPlanService = paymentPlanService;
		this.duplicateDetectionService = duplicateDetectionService;
		this.transactionConversionService = transactionConversionService;
		this.conversionRecalculationService = conversionRecalculationService;
		this.exchangeRateRefreshScheduleService = exchangeRateRefreshScheduleService;
		this.exchangeRateService = exchangeRateService;
		this.gmailIngestionService = gmailIngestionService;
		this.languageContext = languageContext;
	}

	@Scheduled(every = "1h", delayed = "45s", concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
	@Transactional
	public void processPaymentPlansJob() {
		withJobCorrelation("scheduler:payment-plan", () -> {
			LOG.info("Starting payment plan draft generator job...");
			paymentPlanService.processDueItems();
		});
	}

	@Scheduled(every = "1h", delayed = "30s", concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
	@Transactional
	public void processSubscriptionsJob() {
		withJobCorrelation("scheduler:subscription", this::runSubscriptionsJob);
	}

	private void runSubscriptionsJob() {
		LOG.info("Starting subscription processor job...");
		long startedAtMillis = System.currentTimeMillis();
		int processedCount = 0;
		int failedCount = 0;

		List<SystemJobEntity> pendingJobs;
		try {
			pendingJobs = systemJobRepository.findPendingJobsByCategory(JobCategory.SUBSCRIPTION_PROCESSOR);
		} catch (RuntimeException exception) {
			LOG.warn("Skipping subscription processor job due to temporary database unavailability.", exception);
			logJobSummary(JOB_SUBSCRIPTION_PROCESSOR, JOB_STATUS_SKIPPED, processedCount, failedCount, startedAtMillis);
			return;
		}

		for (SystemJobEntity job : pendingJobs) {
			if (job.nextExecutionDate.isAfter(LocalDateTime.now())) {
				continue;
			}

			try {
				if (job.entityId != null) {
					subscriptionService.processSubscription(Long.valueOf(job.entityId));
					job.status = JobStatus.COMPLETED;
					job.message = "Successfully processed subscription " + job.entityId;
					LOG.infof("Job completed successfully for subscription %s.", job.entityId);
				} else {
					job.status = JobStatus.FAILED;
					job.message = "No entityId associated with this job.";
					LOG.warn("Job failed: entityId is null.");
				}
			} catch (Exception e) {
				LOG.error("Job failed.", e);
				job.status = JobStatus.FAILED;
				job.message = "Failed: " + e.getMessage();
			}

			systemJobRepository.persist(job);
			if (job.status == JobStatus.COMPLETED) {
				processedCount++;
			} else {
				failedCount++;
			}
		}

		logJobSummary(JOB_SUBSCRIPTION_PROCESSOR, JOB_STATUS_COMPLETED, processedCount, failedCount, startedAtMillis);
	}

	@Scheduled(every = "1h", concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
	@Transactional
	public void processDuplicateDetectionJob() {
		withJobCorrelation("scheduler:duplicate-detection", this::runDuplicateDetectionJob);
	}

	private void runDuplicateDetectionJob() {
		LOG.info("Starting duplicate detection job...");
		long startedAtMillis = System.currentTimeMillis();
		int processedCount = 0;
		int failedCount = 0;

		List<SystemJobEntity> pendingJobs = systemJobRepository.findPendingJobsByCategory(JobCategory.DUPLICATE_DETECTION);

		for (SystemJobEntity job : pendingJobs) {
			if (job.nextExecutionDate.isAfter(LocalDateTime.now())) {
				continue;
			}

			try {
				if (job.entityId != null) {
					String[] parts = job.entityId.split(":");
					if (parts.length == 2) {
						String type = parts[0];
						Long id = Long.valueOf(parts[1]);

						if ("EVENT".equals(type)) {
							duplicateDetectionService.detectDuplicatesForEvent(id);
						} else if ("CATEGORY".equals(type)) {
							duplicateDetectionService.detectDuplicatesForCategory(id);
						} else if ("TAG".equals(type)) {
							duplicateDetectionService.detectDuplicatesForTag(id);
						}
					}
					job.status = JobStatus.COMPLETED;
					job.message = "Successfully processed duplicate detection " + job.entityId;
					LOG.infof("Job completed successfully for duplicate detection %s.", job.entityId);
				} else {
					job.status = JobStatus.FAILED;
					job.message = "No entityId associated with this job.";
					LOG.warn("Job failed: entityId is null.");
				}
			} catch (Exception e) {
				LOG.error("Job failed.", e);
				job.status = JobStatus.FAILED;
				job.message = "Failed: " + e.getMessage();
			}

			systemJobRepository.persist(job);
			if (job.status == JobStatus.COMPLETED) {
				processedCount++;
			} else {
				failedCount++;
			}
		}

		logJobSummary(JOB_DUPLICATE_DETECTION, JOB_STATUS_COMPLETED, processedCount, failedCount, startedAtMillis);
	}

	/**
	 * Converts past transactions into a currency that became principal. Deliberately not
	 * {@code @Transactional}: each batch commits on its own so a long history is converted
	 * progressively, and SQLite's single pooled connection is never held by one long transaction.
	 */
	@Scheduled(every = "30s", delayed = "20s", concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
	public void processCurrencyConversionBackfillJob() {
		withJobCorrelation("scheduler:currency-backfill", this::runCurrencyConversionBackfillJob);
	}

	private record BackfillOutcome(int convertedCount, int skippedCount, Set<String> unquotedCurrencies) {
	}

	private void runCurrencyConversionBackfillJob() {
		List<SystemJobEntity> pendingJobs;
		try {
			pendingJobs = QuarkusTransaction.requiringNew().call(() ->
					systemJobRepository.findPendingJobsByCategory(JobCategory.CURRENCY_CONVERSION_BACKFILL));
		} catch (RuntimeException exception) {
			LOG.warn("Skipping currency conversion backfill due to temporary database unavailability.", exception);
			return;
		}
		if (pendingJobs.isEmpty()) return;

		long startedAtMillis = System.currentTimeMillis();
		int convertedCount = 0;
		int skippedCount = 0;
		for (SystemJobEntity job : pendingJobs) {
			BackfillOutcome outcome = runBackfillJob(job);
			convertedCount += outcome.convertedCount();
			skippedCount += outcome.skippedCount();
		}
		logJobSummary(JOB_CURRENCY_CONVERSION_BACKFILL, JOB_STATUS_COMPLETED, convertedCount, skippedCount, startedAtMillis);
	}

	/**
	 * Transactions skipped for lack of a quote are not failures of the job: they stay unconverted
	 * and are picked up again once the missing quote is recorded, which re-queues this job.
	 */
	private BackfillOutcome runBackfillJob(SystemJobEntity job) {
		String currency = job.entityId;
		try {
			BackfillOutcome outcome = backfillCurrency(currency);
			String message = "Converted " + outcome.convertedCount() + " transactions into " + currency
					+ (outcome.skippedCount() > 0
							? "; " + outcome.skippedCount() + " left without a quote for " + String.join(", ", outcome.unquotedCurrencies())
							: "");
			finishJob(job.id, JobStatus.COMPLETED, message);
			LOG.infof("Currency conversion backfill into %s: converted=%d skipped=%d",
					currency, outcome.convertedCount(), outcome.skippedCount());
			return outcome;
		} catch (RuntimeException exception) {
			LOG.errorf(exception, "Currency conversion backfill into %s failed.", currency);
			finishJob(job.id, JobStatus.FAILED, "Failed: " + exception.getMessage());
			return new BackfillOutcome(0, 0, Set.of());
		}
	}

	private BackfillOutcome backfillCurrency(String currency) {
		int convertedCount = 0;
		int skippedCount = 0;
		Set<String> unquotedCurrencies = new LinkedHashSet<>();
		ConversionBackfillBatchDto batch;
		long resumeAfterId = 0;
		do {
			batch = transactionConversionService.backfillBatch(currency, resumeAfterId);
			convertedCount += batch.convertedCount();
			skippedCount += batch.skippedCount();
			unquotedCurrencies.addAll(batch.unquotedCurrencies());
			resumeAfterId = batch.lastTransactionId();
		} while (batch.hasMore());
		return new BackfillOutcome(convertedCount, skippedCount, unquotedCurrencies);
	}

	private void finishJob(Long jobId, JobStatus status, String message) {
		QuarkusTransaction.requiringNew().run(() -> {
			SystemJobEntity job = systemJobRepository.findById(jobId);
			if (job == null) return;
			job.status = status;
			job.message = message.length() > JOB_MESSAGE_MAX_LENGTH ? message.substring(0, JOB_MESSAGE_MAX_LENGTH) : message;
		});
	}

	/**
	 * Re-prices past transactions with the rate the user chose for a conversion recalculation.
	 * Deliberately not {@code @Transactional}, for the same reason as the backfill: each batch
	 * commits on its own.
	 */
	@Scheduled(every = "30s", delayed = "25s", concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
	public void processConversionRecalculationJob() {
		withJobCorrelation("scheduler:currency-recalculation", this::runConversionRecalculationJob);
	}

	private void runConversionRecalculationJob() {
		List<ConversionRecalculationDto> pendingRecalculations;
		try {
			pendingRecalculations = conversionRecalculationService.listPending();
		} catch (RuntimeException exception) {
			LOG.warn("Skipping conversion recalculation due to temporary database unavailability.", exception);
			return;
		}
		if (pendingRecalculations.isEmpty()) return;

		long startedAtMillis = System.currentTimeMillis();
		int completedCount = 0;
		int failedCount = 0;
		for (ConversionRecalculationDto recalculation : pendingRecalculations) {
			boolean hasCompleted = runRecalculation(recalculation);
			if (hasCompleted) {
				completedCount++;
			} else {
				failedCount++;
			}
		}
		logJobSummary(JOB_CURRENCY_CONVERSION_RECALCULATION, JOB_STATUS_COMPLETED, completedCount, failedCount, startedAtMillis);
	}

	/**
	 * A failure leaves the batches already committed in place: those transactions keep the new rate
	 * and the recalculation records how many got it, so the user can simply request it again.
	 */
	private boolean runRecalculation(ConversionRecalculationDto recalculation) {
		int recalculatedCount = 0;
		long resumeAfterId = 0;
		try {
			ConversionRecalculationBatchDto batch;
			do {
				batch = transactionConversionService.recalculateBatch(recalculation, resumeAfterId);
				recalculatedCount += batch.recalculatedCount();
				resumeAfterId = batch.lastTransactionId();
			} while (batch.hasMore());
			conversionRecalculationService.complete(recalculation.id(), recalculatedCount);
			LOG.infof("Conversion recalculation %d from %s into %s: recalculated=%d",
					recalculation.id(), recalculation.sourceCurrency(), recalculation.targetCurrency(), recalculatedCount);
			return true;
		} catch (RuntimeException exception) {
			LOG.errorf(exception, "Conversion recalculation %d failed.", recalculation.id());
			conversionRecalculationService.fail(recalculation.id(), recalculatedCount, "Failed: " + exception.getMessage());
			return false;
		}
	}

	/**
	 * Records the exchange rate provider's quotes once a day, at the time the user scheduled. It checks
	 * every minute because that time is the user's own choice, not one fixed at build time. Runs with
	 * a request context of its own: the quotes are recorded through the same services a request
	 * uses, which read the language their messages are written in from it.
	 */
	@Scheduled(every = "1m", delayed = "50s", concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
	@ActivateRequestContext
	public void processExchangeRateRefreshJob() {
		withJobCorrelation("scheduler:exchange-rate-refresh", this::runExchangeRateRefreshJob);
	}

	private void runExchangeRateRefreshJob() {
		Optional<String> claimedRunLanguage;
		try {
			claimedRunLanguage = exchangeRateRefreshScheduleService.claimDueRun();
		} catch (RuntimeException exception) {
			LOG.warn("Skipping exchange rate refresh due to temporary database unavailability.", exception);
			return;
		}
		if (claimedRunLanguage.isEmpty()) return;

		languageContext.setLang(claimedRunLanguage.get());
		long startedAtMillis = System.currentTimeMillis();
		try {
			List<ExchangeRateDto> recorded = exchangeRateService.refreshFromProvider();
			exchangeRateRefreshScheduleService.recordRunOutcome(null);
			logJobSummary(JOB_EXCHANGE_RATE_REFRESH, JOB_STATUS_COMPLETED, recorded.size(), 0, startedAtMillis);
		} catch (RuntimeException exception) {
			LOG.warnf("Automatic exchange rate refresh failed: %s", exception.getMessage());
			exchangeRateRefreshScheduleService.recordRunOutcome(exception.getMessage());
			logJobSummary(JOB_EXCHANGE_RATE_REFRESH, JOB_STATUS_COMPLETED, 0, 1, startedAtMillis);
		}
	}

	/**
	 * Turns the spending emails of the user's Gmail account into draft events. The interval comes
	 * from {@code GMAIL_POLL_INTERVAL} and the job is off until it is set. A run that fails as a whole
	 * (revoked grant, unreachable Google) is reported with {@code job_status=skipped}, because every
	 * email it would have ingested is still waiting and the ledger is understated until it recovers.
	 */
	@Scheduled(every = "{mypaybyday.gmail.poll-interval}", delayed = "60s", concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
	@ActivateRequestContext
	public void processGmailIngestionJob() {
		withJobCorrelation("scheduler:gmail-ingestion", this::runGmailIngestionJob);
	}

	private void runGmailIngestionJob() {
		long startedAtMillis = System.currentTimeMillis();
		if (!gmailIngestionService.isConfigured()) {
			LOG.error("Gmail ingestion is enabled but its credentials, source labels or chatbot URL are not configured.");
			logJobSummary(JOB_GMAIL_INGESTION, JOB_STATUS_SKIPPED, 0, 0, startedAtMillis);
			return;
		}

		try {
			GmailIngestionResultDto result = gmailIngestionService.ingest();
			logJobSummary(JOB_GMAIL_INGESTION, JOB_STATUS_COMPLETED, result.ingestedCount(), result.failedCount(), startedAtMillis);
		} catch (RuntimeException exception) {
			LOG.error("Gmail ingestion run failed.", exception);
			logJobSummary(JOB_GMAIL_INGESTION, JOB_STATUS_SKIPPED, 0, 0, startedAtMillis);
		}
	}

	@Transactional
	public void onDuplicateDetectionRequested(@ObservesAsync DuplicateDetectionEvent event) {
		String requestId = event.requestId() != null ? event.requestId() : "async-" + UUID.randomUUID();
		MDC.put(CorrelationIdFilter.MDC_KEY, requestId);
		MDC.put(CorrelationIdFilter.MDC_SOURCE_KEY, "async-duplicate-detection");
		try {
			LOG.infof("Immediate duplicate detection triggered for %s:%d", event.type(), event.id());
			switch (event.type()) {
				case "EVENT" -> duplicateDetectionService.detectDuplicatesForEvent(event.id());
				case "CATEGORY" -> duplicateDetectionService.detectDuplicatesForCategory(event.id());
				case "TAG" -> duplicateDetectionService.detectDuplicatesForTag(event.id());
				default -> LOG.warnf("Unknown duplicate detection type: %s", event.type());
			}
		} catch (Exception e) {
			LOG.errorf(e, "Immediate duplicate detection failed for %s:%d", event.type(), event.id());
		} finally {
			MDC.remove(CorrelationIdFilter.MDC_KEY);
			MDC.remove(CorrelationIdFilter.MDC_SOURCE_KEY);
		}
	}

}
