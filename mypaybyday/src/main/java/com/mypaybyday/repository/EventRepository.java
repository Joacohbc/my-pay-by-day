package com.mypaybyday.repository;

import com.mypaybyday.entity.FinanceEvent;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class EventRepository implements PanacheRepository<FinanceEvent> {
}
