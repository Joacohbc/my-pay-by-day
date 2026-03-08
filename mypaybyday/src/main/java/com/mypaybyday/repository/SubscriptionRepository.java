package com.mypaybyday.repository;

import com.mypaybyday.entity.Subscription;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class SubscriptionRepository implements PanacheRepository<Subscription> {
}
