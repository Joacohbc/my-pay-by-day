package com.mypaybyday.dto;

import java.time.LocalTime;

import org.eclipse.microprofile.openapi.annotations.enums.SchemaType;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * A new automatic refresh schedule. The time is read in the zone of the user saving it.
 *
 * @param enabled          whether the refresh runs at all
 * @param refreshTime      wall-clock time from which each day's refresh runs
 * @param businessDaysOnly whether Saturdays and Sundays are skipped
 */
public record UpdateExchangeRateRefreshScheduleDto(
		boolean enabled,
		@Schema(type = SchemaType.STRING, format = "time", example = "18:00") LocalTime refreshTime,
		boolean businessDaysOnly) {
}
