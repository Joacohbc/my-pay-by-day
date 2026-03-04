package com.mypaybyday.repository;

import com.mypaybyday.entity.TemplateLineItem;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class TemplateLineItemRepository implements PanacheRepository<TemplateLineItem> {
}
