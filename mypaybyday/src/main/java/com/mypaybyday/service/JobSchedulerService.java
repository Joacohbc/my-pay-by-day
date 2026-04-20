package com.mypaybyday.service;

import java.time.LocalDate;
import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.ObservesAsync;
import jakarta.transaction.Transactional;

import com.mypaybyday.entity.SystemJobEntity;
import com.mypaybyday.enums.JobCategory;
import com.mypaybyday.enums.JobStatus;
import com.mypaybyday.repository.SystemJobRepository;
import com.mypaybyday.service.duplicate.DuplicateDetectionEvent;
import com.mypaybyday.service.duplicate.DuplicateDetectionService;

import io.quarkus.scheduler.Scheduled;
import org.jboss.logging.Logger;

@ApplicationScoped
public class JobSchedulerService {

	private static final Logger LOG = Logger.getLogger(JobSchedulerService.class);

	private final SystemJobRepository systemJobRepository;
	private final SubscriptionService subscriptionService;
	private final DuplicateDetectionService duplicateDetectionService;

	public JobSchedulerService(SystemJobRepository systemJobRepository, SubscriptionService subscriptionService, DuplicateDetectionService duplicateDetectionService) {
		this.systemJobRepository = systemJobRepository;
		this.subscriptionService = subscriptionService;
		this.duplicateDetectionService = duplicateDetectionService;
	}

	@Scheduled(every = "1h", delayed = "30s", concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
	@Transactional
	public void processSubscriptionsJob() {
		LOG.info("Starting subscription processor job...");

		List<SystemJobEntity> pendingJobs;
		try {
			pendingJobs = systemJobRepository.findPendingJobsByCategory(JobCategory.SUBSCRIPTION_PROCESSOR);
		} catch (RuntimeException exception) {
			LOG.warn("Skipping subscription processor job due to temporary database unavailability.", exception);
			return;
		}

		for (SystemJobEntity job : pendingJobs) {
			if (job.nextExecutionDate.isAfter(LocalDate.now())) {
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
		}

		LOG.info("Subscription processor job completed.");
	}

	@Scheduled(every = "1h", concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
	@Transactional
	public void processDuplicateDetectionJob() {
		LOG.info("Starting duplicate detection job...");

		List<SystemJobEntity> pendingJobs = systemJobRepository.findPendingJobsByCategory(JobCategory.DUPLICATE_DETECTION);

		for (SystemJobEntity job : pendingJobs) {
			if (job.nextExecutionDate.isAfter(LocalDate.now())) {
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
		}

		LOG.info("Duplicate detection job completed.");
	}

	@Transactional
	public void onDuplicateDetectionRequested(@ObservesAsync DuplicateDetectionEvent event) {
		LOG.infof("Immediate duplicate detection triggered for %s:%d", event.type(), event.id());
		try {
			switch (event.type()) {
				case "EVENT" -> duplicateDetectionService.detectDuplicatesForEvent(event.id());
				case "CATEGORY" -> duplicateDetectionService.detectDuplicatesForCategory(event.id());
				case "TAG" -> duplicateDetectionService.detectDuplicatesForTag(event.id());
				default -> LOG.warnf("Unknown duplicate detection type: %s", event.type());
			}
		} catch (Exception e) {
			LOG.errorf(e, "Immediate duplicate detection failed for %s:%d", event.type(), event.id());
		}
	}

}
