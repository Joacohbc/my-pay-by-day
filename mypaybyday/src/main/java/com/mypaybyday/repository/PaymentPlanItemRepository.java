package com.mypaybyday.repository;

import java.time.LocalDate;
import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.PaymentPlanItemEntity;
import com.mypaybyday.enums.PaymentPlanItemStatus;
import io.quarkus.hibernate.orm.panache.PanacheRepository;

@ApplicationScoped
public class PaymentPlanItemRepository implements PanacheRepository<PaymentPlanItemEntity> {

	public List<PaymentPlanItemEntity> findDueItems(LocalDate beforeOrEqualDate) {
		return list("itemStatus = ?1 and expectedDate <= ?2", PaymentPlanItemStatus.PENDING, beforeOrEqualDate);
	}

	public List<PaymentPlanItemEntity> findByDraftIds(List<Long> draftIds) {
		if (draftIds == null || draftIds.isEmpty()) {
			return List.of();
		}
		return list("draft.id in ?1", draftIds);
	}
}
