package com.mypaybyday.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import com.mypaybyday.entity.PaymentPlanEntity;
import com.mypaybyday.enums.PaymentPlanStatus;
import com.mypaybyday.enums.PaymentPlanType;
import com.mypaybyday.enums.RecurrenceFrequency;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(description = "Data transfer object representing a Payment Plan")
public record PaymentPlanDto(
	@Schema(required = true) Long id,
	@Schema(required = true) String name,
	String description,
	@Schema(required = true) PaymentPlanType planType,
	@Schema(required = true) PaymentPlanStatus status,
	Integer totalInstallments,
	BigDecimal totalAmount,
	BigDecimal installmentAmount,
	@Schema(required = true) RecurrenceFrequency frequency,
	@Schema(required = true) LocalDate startDate,
	LocalDate nextDueDate,
	boolean isAutomated,
	boolean autoCreateDraft,
	FinanceNodeDto originNode,
	FinanceNodeDto destinationNode,
	CategoryDto category,
	List<TagDto> tags,
	List<PaymentPlanItemDto> items,
	int completedInstallments,
	BigDecimal paidAmount,
	BigDecimal remainingAmount
) {
	public static PaymentPlanDto from(PaymentPlanEntity entity) {
		if (entity == null) return null;

		List<PaymentPlanItemDto> itemDtos = entity.items != null
			? entity.items.stream().map(PaymentPlanItemDto::from).sorted((a, b) -> Integer.compare(a.installmentNumber(), b.installmentNumber())).toList()
			: List.of();

		int completed = (int) itemDtos.stream().filter(i -> i.eventId() != null).count();
		BigDecimal paid = entity.items != null
			? entity.items.stream()
				.filter(i -> i.event != null)
				.map(i -> FinanceEventDto.from(i.event).amount())
				.reduce(BigDecimal.ZERO, BigDecimal::add)
			: BigDecimal.ZERO;

		BigDecimal remaining = BigDecimal.ZERO;
		if (entity.totalAmount != null) {
			remaining = entity.totalAmount.subtract(paid);
			if (remaining.compareTo(BigDecimal.ZERO) < 0) {
				remaining = BigDecimal.ZERO;
			}
		}

		return new PaymentPlanDto(
			entity.id,
			entity.name,
			entity.description,
			entity.planType,
			entity.status,
			entity.totalInstallments,
			entity.totalAmount,
			entity.installmentAmount,
			entity.frequency,
			entity.startDate,
			entity.nextDueDate,
			entity.isAutomated,
			entity.autoCreateDraft,
			entity.originNode != null ? FinanceNodeDto.from(entity.originNode) : null,
			entity.destinationNode != null ? FinanceNodeDto.from(entity.destinationNode) : null,
			entity.category != null ? CategoryDto.from(entity.category) : null,
			entity.tags != null ? entity.tags.stream().map(TagDto::from).toList() : List.of(),
			itemDtos,
			completed,
			paid,
			remaining
		);
	}
}
