package com.mypaybyday.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import com.mypaybyday.entity.ConversionRecalculationEntity;
import com.mypaybyday.enums.JobStatus;

/**
 * A requested recalculation of past conversions and how far it got.
 *
 * @param rate              units of {@code targetCurrency} per one unit of {@code sourceCurrency}
 * @param status            {@code PENDING} until the background job has gone through every
 *                          affected transaction
 * @param recalculatedCount transactions that received the new rate
 * @param message           why it failed, when it did
 * @param requestedAt       when the user asked for it
 */
public record ConversionRecalculationDto(
		Long id,
		String sourceCurrency,
		String targetCurrency,
		BigDecimal rate,
		@Schema(nullable = true) LocalDateTime startDate,
		@Schema(nullable = true) LocalDateTime endDate,
		JobStatus status,
		int recalculatedCount,
		@Schema(nullable = true) String message,
		Instant requestedAt) {

	public static ConversionRecalculationDto from(ConversionRecalculationEntity recalculation) {
		return new ConversionRecalculationDto(
				recalculation.id,
				recalculation.sourceCurrency,
				recalculation.targetCurrency,
				recalculation.rate,
				recalculation.startDate,
				recalculation.endDate,
				recalculation.status,
				recalculation.recalculatedCount,
				recalculation.message,
				recalculation.createdAt);
	}
}
