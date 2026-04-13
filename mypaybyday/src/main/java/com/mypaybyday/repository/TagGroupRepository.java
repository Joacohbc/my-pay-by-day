package com.mypaybyday.repository;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.TagGroupEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepository;

@ApplicationScoped
public class TagGroupRepository implements PanacheRepository<TagGroupEntity> {
}
