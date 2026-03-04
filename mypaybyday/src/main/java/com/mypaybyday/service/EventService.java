package com.mypaybyday.service;

import com.mypaybyday.entity.Category;
import com.mypaybyday.entity.FinanceEvent;
import com.mypaybyday.entity.Tag;
import com.mypaybyday.entity.FinanceTransaction;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.repository.CategoryRepository;
import com.mypaybyday.repository.EventRepository;
import com.mypaybyday.repository.TagRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Service responsible for managing {@link FinanceEvent} lifecycle.
 *
 * <p>This service is the single entry point for all Event-related operations.
 * Per the Wrapper Isolation Rule, all {@link FinanceTransaction} and {@link FinanceLineItem}
 * creation/mutation must go through this service — never directly through the
 * operational-layer repositories.
 */
@ApplicationScoped
public class EventService {

    @Inject
    EventRepository eventRepository;

    @Inject
    TransactionService transactionService;

    @Inject
    CategoryRepository categoryRepository;

    @Inject
    TagRepository tagRepository;

    // -------------------------------------------------------------------------
    // Queries
    // -------------------------------------------------------------------------

    public List<FinanceEvent> listAll() {
        return eventRepository.listAll();
    }

    public FinanceEvent findById(Long id) {
        FinanceEvent event = eventRepository.findById(id);
        if (event == null) {
            throw new BusinessException("Event not found");
        }
        return event;
    }

    /**
     * Returns all events whose associated transaction date falls within the given range.
     * This is the mechanism used for Temporal Independence: budget period membership is
     * determined dynamically at query time, never via a hard foreign-key.
     */
    public List<FinanceEvent> findByDateRange(LocalDateTime from, LocalDateTime to) {
        if (from == null || to == null) {
            throw new BusinessException("Date range boundaries cannot be null");
        }
        if (from.isAfter(to)) {
            throw new BusinessException("'from' date must not be after 'to' date");
        }
        return eventRepository.list(
                "transaction.transactionDate >= ?1 and transaction.transactionDate <= ?2",
                from, to);
    }

    // -------------------------------------------------------------------------
    // Commands
    // -------------------------------------------------------------------------

    /**
     * Creates a new {@link FinanceEvent} together with its inner {@link FinanceTransaction}.
     *
     * <p>The caller must supply a fully populated Event that includes a non-null
     * {@link FinanceTransaction} with at least one {@link FinanceLineItem}. The service validates the
     * Zero-Sum Rule before persisting anything.
     *
     * <p>If a {@code category} or {@code tags} are supplied by ID, they are resolved and
     * attached before persistence.
     *
     * @param event the event to create, containing a nested Transaction
     * @return the persisted Event with generated IDs
     */
    @Transactional
    public FinanceEvent create(FinanceEvent event) {
        if (event.transaction == null) {
            throw new BusinessException("Event must include a Transaction");
        }

        // Delegate to TransactionService: validates Zero-Sum, node existence, and persists
        FinanceTransaction tx = transactionService.create(event.transaction);

        // Resolve Category reference (only the ID is trusted from clients)
        if (event.category != null && event.category.id != null) {
            Category category = categoryRepository.findById(event.category.id);
            if (category == null) {
                throw new BusinessException("Category not found: " + event.category.id);
            }
            event.category = category;
        }

        // Resolve Tag references
        event.tags = resolveTags(event.tags);

        event.transaction = tx;
        eventRepository.persist(event);
        return event;
    }

    /**
     * Updates the metadata, category, tags, and/or transaction of an existing Event.
     *
     * <p>Updating the transaction replaces its date and all line items atomically.
     * The Zero-Sum Rule is re-validated whenever line items change.
     *
     * @param id            the ID of the Event to update
     * @param eventDetails  object carrying the new field values
     * @return the updated, managed Event
     */
    @Transactional
    public FinanceEvent update(Long id, FinanceEvent eventDetails) {
        FinanceEvent event = eventRepository.findById(id);
        if (event == null) {
            throw new BusinessException("Event not found");
        }

        // --- Metadata ---
        if (eventDetails.name != null && !eventDetails.name.isBlank()) {
            event.name = eventDetails.name;
        }
        event.description = eventDetails.description;
        event.receiptUrl = eventDetails.receiptUrl;
        if (eventDetails.type != null) {
            event.type = eventDetails.type;
        }

        // --- Category ---
        if (eventDetails.category != null) {
            if (eventDetails.category.id == null) {
                throw new BusinessException("Category ID must be provided for update");
            }
            Category category = categoryRepository.findById(eventDetails.category.id);
            if (category == null) {
                throw new BusinessException("Category not found: " + eventDetails.category.id);
            }
            event.category = category;
        } else {
            event.category = null;
        }

        // --- Tags ---
        event.tags = resolveTags(eventDetails.tags);

        // --- Transaction ---
        if (eventDetails.transaction != null) {
            // Delegate to TransactionService: validates Zero-Sum, node existence, and updates
            transactionService.update(event.transaction.id, eventDetails.transaction);
        }

        return event;
    }

    /**
     * Permanently deletes an Event and its associated Transaction (cascade).
     *
     * @param id the ID of the Event to delete
     */
    @Transactional
    public void delete(Long id) {
        FinanceEvent event = eventRepository.findById(id);
        if (event == null) {
            throw new BusinessException("Event not found");
        }
        eventRepository.delete(event);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Resolves a list of Tag stubs (containing only IDs) into managed Tag entities.
     * Returns an empty list if the input is null.
     */
    private List<Tag> resolveTags(List<Tag> stubs) {
        if (stubs == null || stubs.isEmpty()) {
            return new ArrayList<>();
        }
        List<Tag> resolved = new ArrayList<>();
        for (Tag stub : stubs) {
            if (stub.id == null) {
                throw new BusinessException("All tags must include a valid ID");
            }
            Tag tag = tagRepository.findById(stub.id);
            if (tag == null) {
                throw new BusinessException("Tag not found: " + stub.id);
            }
            resolved.add(tag);
        }
        return resolved;
    }
}
