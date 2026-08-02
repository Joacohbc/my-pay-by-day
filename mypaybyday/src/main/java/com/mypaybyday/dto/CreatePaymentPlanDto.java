package com.mypaybyday.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import com.mypaybyday.enums.PaymentPlanStatus;
import com.mypaybyday.enums.PaymentPlanType;
import com.mypaybyday.enums.RecurrenceFrequency;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(description = "DTO for creating or updating a Payment Plan")
public record CreatePaymentPlanDto(
	@Schema(required = true) String name,
	String description,
	@Schema(required = true) PaymentPlanType planType,
	@Schema(description = "INSTALLMENT only: how many cuotas the purchase is split into. Required for that type.") Integer totalInstallments,
	@Schema(description = "INSTALLMENT only: full price of the purchase, used to report the remaining balance.") BigDecimal totalAmount,
	@Schema(description = "Amount of a single cycle. Required when the plan is automated; ignored by CUSTOM and GROUP.") BigDecimal installmentAmount,
	@Schema(description = "Cadence of the plan. Required by INSTALLMENT and RECURRING; ignored by CUSTOM and GROUP.") RecurrenceFrequency frequency,
	@Schema(required = true) LocalDate startDate,
	@Schema(description = "Last date the plan covers. Required by CUSTOM; optional on RECURRING, which is open-ended without it.") LocalDate endDate,
	@Schema(description = "INSTALLMENT and RECURRING only. When true, templateId and installmentAmount are required.") Boolean isAutomated,
	Boolean autoCreateDraft,
	@Schema(description = "Template supplying the origin and destination nodes of every generated event. Required when the plan is automated.") Long templateId,
	@Schema(description = "When false, the plan is created without its scheduled items so they can be added manually. Defaults to true.") Boolean generateItems,
	PaymentPlanStatus status,
	Long categoryId,
	List<Long> tagIds,
	@Schema(description = "GROUP plans only: existing finance events to link as already-settled members of the group.") List<Long> eventIds,
	@Schema(description = "GROUP plans only: existing drafts to link as pending members of the group.") List<Long> draftIds
) {}
