package com.mypaybyday.repository;

import com.mypaybyday.entity.TimePeriodEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class TimePeriodRepository implements PanacheRepository<TimePeriodEntity> {
}
