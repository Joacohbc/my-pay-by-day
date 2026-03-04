package com.mypaybyday.repository;

import com.mypaybyday.entity.FinanceNode;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class FinanceNodeRepository implements PanacheRepository<FinanceNode> {
}
