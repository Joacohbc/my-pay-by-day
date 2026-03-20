package com.mypaybyday.repository;

import java.util.List;

import com.mypaybyday.entity.FinanceEvent;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class EventRepository implements PanacheRepository<FinanceEvent> {

    /**
     * Fetches the most recent events ordered by transaction date descending.
     * Used for in-memory similarity search (names are encrypted, so JPQL LIKE is impossible).
     */
    public List<FinanceEvent> findRecentWithDetails(int limit) {
        return find("ORDER BY transaction.transactionDate DESC")
                .page(0, limit)
                .list();
    }
}
