package com.mypaybyday.dto;

import java.time.LocalDate;

import com.mypaybyday.enums.PaymentPlanItemStatus;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(description = "DTO for creating or updating an individual payment plan item / cuota")
public record CreatePaymentPlanItemDto(
	@Schema(description = "Position of the item within the plan. Assigned automatically when omitted.") Integer installmentNumber,
	@Schema(required = true, description = "Must fall inside the window the plan covers.") LocalDate expectedDate,
	@Schema(description = "Defaults to PENDING when omitted.") PaymentPlanItemStatus itemStatus,
	Long eventId,
	Long draftId
) {}
