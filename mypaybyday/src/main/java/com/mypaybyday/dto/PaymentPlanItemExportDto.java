package com.mypaybyday.dto;

import java.time.LocalDate;

import com.mypaybyday.entity.PaymentPlanItemEntity;
import com.mypaybyday.enums.PaymentPlanItemStatus;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(description = "Archive shape of a payment plan item: references travel as ids so an import can remap them")
public record PaymentPlanItemExportDto(
		@Schema(required = true) Long id,
		@Schema(required = true) Integer installmentNumber,
		@Schema(required = true) LocalDate expectedDate,
		Long eventId,
		Long draftId,
		@Schema(required = true) PaymentPlanItemStatus itemStatus
) {
	public static PaymentPlanItemExportDto from(PaymentPlanItemEntity entity) {
		return new PaymentPlanItemExportDto(
				entity.id,
				entity.installmentNumber,
				entity.expectedDate,
				entity.event != null ? entity.event.id : null,
				entity.draft != null ? entity.draft.id : null,
				entity.itemStatus);
	}
}
