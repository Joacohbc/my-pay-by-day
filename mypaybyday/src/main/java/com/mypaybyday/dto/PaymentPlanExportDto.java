package com.mypaybyday.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

import com.mypaybyday.entity.PaymentPlanEntity;
import com.mypaybyday.enums.PaymentPlanStatus;
import com.mypaybyday.enums.PaymentPlanType;
import com.mypaybyday.enums.RecurrenceFrequency;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * Archive shape of a payment plan. Distinct from {@link PaymentPlanDto}, which nests whole
 * Template, Category and Tag objects that other sections already carry, and adds derived figures
 * that are recomputed rather than stored. Here every reference is an id an import can remap, and
 * every component maps to a persisted column, so a restore reproduces the plan exactly.
 */
@Schema(description = "Archive shape of a payment plan, with references as remappable ids")
public record PaymentPlanExportDto(
		@Schema(required = true) Long id,
		@Schema(required = true) String name,
		String description,
		@Schema(required = true) PaymentPlanType planType,
		@Schema(required = true) PaymentPlanStatus status,
		Integer totalInstallments,
		BigDecimal totalAmount,
		BigDecimal installmentAmount,
		RecurrenceFrequency frequency,
		@Schema(required = true) LocalDate startDate,
		LocalDate endDate,
		LocalDate nextDueDate,
		boolean isAutomated,
		boolean autoCreateDraft,
		Long templateId,
		Long categoryId,
		List<Long> tagIds,
		List<PaymentPlanItemExportDto> items
) {
	public static PaymentPlanExportDto from(PaymentPlanEntity entity) {
		return new PaymentPlanExportDto(
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
				entity.endDate,
				entity.nextDueDate,
				entity.isAutomated,
				entity.autoCreateDraft,
				entity.template != null ? entity.template.id : null,
				entity.category != null ? entity.category.id : null,
				entity.tags != null ? entity.tags.stream().map(tag -> tag.id).toList() : List.of(),
				exportItems(entity));
	}

	private static List<PaymentPlanItemExportDto> exportItems(PaymentPlanEntity entity) {
		if (entity.items == null) return List.of();
		return entity.items.stream()
				.map(PaymentPlanItemExportDto::from)
				.sorted(Comparator.comparing(PaymentPlanItemExportDto::installmentNumber))
				.toList();
	}
}
