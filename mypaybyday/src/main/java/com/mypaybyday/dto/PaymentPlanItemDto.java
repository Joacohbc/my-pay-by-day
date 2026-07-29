package com.mypaybyday.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.mypaybyday.entity.PaymentPlanItemEntity;
import com.mypaybyday.enums.PaymentPlanItemStatus;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(description = "Data transfer object for a individual payment plan item / cuota")
public record PaymentPlanItemDto(
	@Schema(required = true) Long id,
	@Schema(required = true) Long paymentPlanId,
	@Schema(required = true) Integer installmentNumber,
	@Schema(required = true) LocalDate expectedDate,
	BigDecimal expectedAmount,
	Long eventId,
	Long draftId,
	@Schema(required = true) PaymentPlanItemStatus itemStatus
) {
	public static PaymentPlanItemDto from(PaymentPlanItemEntity entity) {
		if (entity == null) return null;
		return new PaymentPlanItemDto(
			entity.id,
			entity.paymentPlan != null ? entity.paymentPlan.id : null,
			entity.installmentNumber,
			entity.expectedDate,
			entity.expectedAmount,
			entity.event != null ? entity.event.id : null,
			entity.draft != null ? entity.draft.id : null,
			entity.itemStatus
		);
	}
}
