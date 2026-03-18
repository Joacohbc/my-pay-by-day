package com.mypaybyday.service;

import com.mypaybyday.entity.SystemJob;
import com.mypaybyday.enums.JobCategory;
import com.mypaybyday.enums.JobStatus;
import com.mypaybyday.repository.SystemJobRepository;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.time.LocalDate;

import org.jboss.logging.Logger;

@ApplicationScoped
public class JobSchedulerService {

    private static final Logger LOG = Logger.getLogger(JobSchedulerService.class);

    @Inject
    SystemJobRepository systemJobRepository;

    @Inject
    SubscriptionService subscriptionService;

    @Scheduled(every = "1h", concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    @Transactional
    public void processSubscriptionsJob() {
        LOG.info("Starting subscription processor job...");

        SystemJob job = systemJobRepository.findByCategory(JobCategory.SUBSCRIPTION_PROCESSOR);
        if (job == null) {
            LOG.info("No system job found for SUBSCRIPTION_PROCESSOR, creating one.");
            job = new SystemJob();
            job.jobCategory = JobCategory.SUBSCRIPTION_PROCESSOR;
            job.status = JobStatus.PENDING;
            job.nextExecutionDate = LocalDate.now();
            systemJobRepository.persist(job);
        }

        if (job.status == JobStatus.COMPLETED && job.nextExecutionDate.isAfter(LocalDate.now())) {
            LOG.info("Job already completed for today. Skipping.");
            return;
        }

        try {
            int processedCount = subscriptionService.processDueSubscriptions();

            job.status = JobStatus.COMPLETED;
            job.nextExecutionDate = LocalDate.now().plusDays(1);
            job.message = "Successfully processed " + processedCount + " subscription(s).";

            LOG.infof("Job completed successfully. Processed %d subscriptions.", processedCount);
        } catch (Exception e) {
            LOG.error("Job failed.", e);
            job.status = JobStatus.FAILED;
            job.nextExecutionDate = LocalDate.now(); // Retry today
            job.message = "Failed: " + e.getMessage();
        }
    }
}
