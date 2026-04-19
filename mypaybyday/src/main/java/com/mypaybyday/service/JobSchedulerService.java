package com.mypaybyday.service;

import java.time.LocalDate;
import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.entity.SystemJobEntity;
import com.mypaybyday.enums.JobCategory;
import com.mypaybyday.enums.JobStatus;
import com.mypaybyday.repository.SystemJobRepository;
import io.quarkus.scheduler.Scheduled;
import org.jboss.logging.Logger;

@ApplicationScoped
public class JobSchedulerService {

	private static final Logger LOG = Logger.getLogger(JobSchedulerService.class);

	private final SystemJobRepository systemJobRepository;
	private final SubscriptionService subscriptionService;

	public JobSchedulerService(SystemJobRepository systemJobRepository, SubscriptionService subscriptionService) {
		this.systemJobRepository = systemJobRepository;
		this.subscriptionService = subscriptionService;
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
}
