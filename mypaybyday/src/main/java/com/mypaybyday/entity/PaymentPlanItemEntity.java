package com.mypaybyday.entity;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

import com.mypaybyday.enums.PaymentPlanItemStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity(name = "PaymentPlanItem")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentPlanItemEntity extends BaseEntity {

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "payment_plan_id", nullable = false)
	public PaymentPlanEntity paymentPlan;

	@Column(name = "installment_number", nullable = false)
	public Integer installmentNumber;

	@Column(name = "expected_date", nullable = false)
	public LocalDate expectedDate;

	@Column(name = "expected_amount")
	public BigDecimal expectedAmount;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "event_id")
	public FinanceEventEntity event;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "draft_id")
	public DraftEntity draft;

	@Enumerated(EnumType.STRING)
	@Column(name = "item_status", nullable = false)
	public PaymentPlanItemStatus itemStatus;
}
