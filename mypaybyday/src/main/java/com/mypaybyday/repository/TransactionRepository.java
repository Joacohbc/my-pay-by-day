package com.mypaybyday.repository;

import com.mypaybyday.entity.FinanceTransaction;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class TransactionRepository implements PanacheRepository<FinanceTransaction> {
}
