package com.mypaybyday.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;

import com.mypaybyday.enums.PaymentPlanStatus;
import com.mypaybyday.enums.PaymentPlanType;
import com.mypaybyday.enums.RecurrenceFrequency;
import com.mypaybyday.validation.RegexValidator;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity(name = "PaymentPlan")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentPlanEntity extends BaseEntity {

	@Column(nullable = false, length = 255)
	public String name;

	@Column(length = RegexValidator.LONG_MAX_LENGTH)
	public String description;

	@Enumerated(EnumType.STRING)
	@Column(name = "plan_type", nullable = false)
	public PaymentPlanType planType;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	public PaymentPlanStatus status;

	@Column(name = "total_installments")
	public Integer totalInstallments;

	@Column(name = "total_amount")
	public BigDecimal totalAmount;

	@Column(name = "installment_amount")
	public BigDecimal installmentAmount;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	public RecurrenceFrequency frequency;

	@Column(name = "start_date", nullable = false)
	public LocalDate startDate;

	@Column(name = "next_due_date")
	public LocalDate nextDueDate;

	@Column(name = "is_automated", nullable = false)
	public boolean isAutomated;

	@Column(name = "auto_create_draft", nullable = false)
	public boolean autoCreateDraft;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "origin_node_id")
	public FinanceNodeEntity originNode;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "destination_node_id")
	public FinanceNodeEntity destinationNode;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "category_id")
	public CategoryEntity category;

	@Builder.Default
	@ManyToMany
	@JoinTable(
		name = "payment_plan_tag",
		joinColumns = @JoinColumn(name = "payment_plan_id"),
		inverseJoinColumns = @JoinColumn(name = "tag_id")
	)
	public Set<TagEntity> tags = new HashSet<>();

	@Builder.Default
	@OneToMany(mappedBy = "paymentPlan", cascade = CascadeType.ALL, orphanRemoval = true)
	public Set<PaymentPlanItemEntity> items = new HashSet<>();
}
