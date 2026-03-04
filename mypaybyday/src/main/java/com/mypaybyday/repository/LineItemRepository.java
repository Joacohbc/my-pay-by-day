package com.mypaybyday.repository;

import com.mypaybyday.entity.LineItem;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class LineItemRepository implements PanacheRepository<LineItem> {
}
