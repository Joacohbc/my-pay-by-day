package com.mypaybyday.repository;

import com.mypaybyday.entity.Template;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class TemplateRepository implements PanacheRepository<Template> {
}
