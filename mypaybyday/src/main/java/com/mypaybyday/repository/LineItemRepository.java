package com.mypaybyday.repository;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.FinanceLineItemEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepository;

@ApplicationScoped
public class LineItemRepository implements PanacheRepository<FinanceLineItemEntity> {
}
