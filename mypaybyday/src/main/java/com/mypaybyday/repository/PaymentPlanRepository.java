package com.mypaybyday.repository;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.PaymentPlanEntity;
import com.mypaybyday.enums.PaymentPlanStatus;
import io.quarkus.hibernate.orm.panache.PanacheRepository;

@ApplicationScoped
public class PaymentPlanRepository implements PanacheRepository<PaymentPlanEntity> {

	public List<PaymentPlanEntity> findActiveAutomatedPlans() {
		return list("status = ?1 and isAutomated = true", PaymentPlanStatus.ACTIVE);
	}
}
