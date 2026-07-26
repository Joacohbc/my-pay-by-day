package com.mypaybyday.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import com.mypaybyday.enums.PaymentPlanType;
import com.mypaybyday.enums.RecurrenceFrequency;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(description = "DTO for creating or updating a Payment Plan")
public record CreatePaymentPlanDto(
	@Schema(required = true) String name,
	String description,
	@Schema(required = true) PaymentPlanType planType,
	Integer totalInstallments,
	BigDecimal totalAmount,
	BigDecimal installmentAmount,
	@Schema(required = true) RecurrenceFrequency frequency,
	@Schema(required = true) LocalDate startDate,
	Boolean isAutomated,
	Boolean autoCreateDraft,
	@Schema(description = "When false, the plan is created without its scheduled items so they can be added manually. Defaults to true.") Boolean generateItems,
	com.mypaybyday.enums.PaymentPlanStatus status,
	Long originNodeId,
	Long destinationNodeId,
	Long categoryId,
	List<Long> tagIds
) {}
