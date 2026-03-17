package com.mypaybyday.service;

import com.mypaybyday.dto.FinanceLineItemDto;
import com.mypaybyday.entity.Subscription;
import com.mypaybyday.entity.SystemJob;
import com.mypaybyday.enums.JobCategory;
import com.mypaybyday.enums.JobStatus;
import com.mypaybyday.enums.SubscriptionStatus;
import com.mypaybyday.repository.SubscriptionRepository;
import com.mypaybyday.repository.SystemJobRepository;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.jboss.logging.Logger;

@ApplicationScoped
public class JobSchedulerService {

    private static final Logger LOG = Logger.getLogger(JobSchedulerService.class);

    @Inject
    SystemJobRepository systemJobRepository;

    @Inject
    SubscriptionRepository subscriptionRepository;

    @Inject
    EventService eventService;

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
            int processedCount = processDueSubscriptions();

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

    private int processDueSubscriptions() {
        LocalDate today = LocalDate.now();
        List<Subscription> dueSubscriptions = subscriptionRepository.find("status = ?1 and nextExecutionDate <= ?2", SubscriptionStatus.ACTIVE, today).list();

        int count = 0;
        for (Subscription sub : dueSubscriptions) {
            try {
                // Generate the event
                createEventFromSubscription(sub);

                // Update next execution date based on recurrence
                switch (sub.recurrence) {
                    case DAILY -> sub.nextExecutionDate = sub.nextExecutionDate.plusDays(1);
                    case WEEKLY -> sub.nextExecutionDate = sub.nextExecutionDate.plusWeeks(1);
                    case MONTHLY -> sub.nextExecutionDate = sub.nextExecutionDate.plusMonths(1);
                    case YEARLY -> sub.nextExecutionDate = sub.nextExecutionDate.plusYears(1);
                }
                count++;
            } catch (Exception e) {
                 LOG.errorf(e, "Failed to process subscription ID: %d", sub.id);
            }
        }
        return count;
    }

    private void createEventFromSubscription(Subscription sub) {
        if (sub.eventType == null || sub.modifierValue == null || sub.originNode == null) {
            LOG.warnf("Subscription %d is missing required fields (eventType, modifierValue, originNode) for event generation. Skipping.", sub.id);
            return;
        }

        // Create Line Items
        List<FinanceLineItemDto> lineItems = new ArrayList<>();

        switch (sub.eventType) {
            case INBOUND -> {
                lineItems.add(new FinanceLineItemDto(null, sub.originNode.id, sub.originNode.name, sub.modifierValue));
            }
            case OUTBOUND -> {
                lineItems.add(new FinanceLineItemDto(null, sub.originNode.id, sub.originNode.name, sub.modifierValue.negate()));
            }
            case OTHER -> {
                if (sub.destinationNode != null) {
                    lineItems.add(new FinanceLineItemDto(null, sub.originNode.id, sub.originNode.name, sub.modifierValue.negate()));
                    lineItems.add(new FinanceLineItemDto(null, sub.destinationNode.id, sub.destinationNode.name, sub.modifierValue));
                } else {
                    LOG.warnf("Subscription %d is type OTHER but missing destinationNode. Skipping.", sub.id);
                    return;
                }
            }
        }

        com.mypaybyday.entity.FinanceTransaction transaction = new com.mypaybyday.entity.FinanceTransaction();
        transaction.transactionDate = LocalDateTime.now();
        transaction.lineItems = new ArrayList<>();

        for (FinanceLineItemDto dto : lineItems) {
             com.mypaybyday.entity.FinanceLineItem item = new com.mypaybyday.entity.FinanceLineItem();
             com.mypaybyday.entity.FinanceNode node = new com.mypaybyday.entity.FinanceNode();
             node.id = dto.financeNodeId();
             item.financeNode = node;
             item.amount = dto.amount();
             item.transaction = transaction;
             transaction.lineItems.add(item);
        }

        com.mypaybyday.entity.FinanceEvent event = new com.mypaybyday.entity.FinanceEvent();
        event.name = sub.name;
        event.description = sub.description != null ? sub.description : "Auto-generated from subscription";
        event.type = sub.eventType;
        event.transaction = transaction;

        if (sub.category != null) {
            com.mypaybyday.entity.Category category = new com.mypaybyday.entity.Category();
            category.id = sub.category.id;
            event.category = category;
        }

        event.tags = new ArrayList<>();
        if (sub.tags != null) {
            for (com.mypaybyday.entity.Tag tag : sub.tags) {
                com.mypaybyday.entity.Tag stub = new com.mypaybyday.entity.Tag();
                stub.id = tag.id;
                event.tags.add(stub);
            }
        }

        eventService.create(event);
    }
}
