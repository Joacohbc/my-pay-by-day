package com.mypaybyday.repository;

import com.mypaybyday.entity.FinanceEventDraft;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class FinanceEventDraftRepository implements PanacheRepository<FinanceEventDraft> {
}
