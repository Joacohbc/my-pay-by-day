package com.mypaybyday.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import com.mypaybyday.entity.ExchangeRateRefreshScheduleEntity;
import org.eclipse.microprofile.openapi.annotations.enums.SchemaType;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * When quotes are refreshed automatically.
 *
 * @param enabled          whether the refresh runs at all
 * @param refreshTime      wall-clock time in {@code timeZone} from which each day's refresh runs
 * @param businessDaysOnly whether Saturdays and Sundays are skipped
 * @param timeZone         the zone {@code refreshTime} is read in: that of whoever last saved it
 * @param lastAttemptOn    day of the last automatic run, or {@code null} if it never ran
 * @param lastFailure      why that run failed, or {@code null} if it succeeded
 */
public record ExchangeRateRefreshScheduleDto(
		boolean enabled,
		@Schema(type = SchemaType.STRING, format = "time", example = "18:00:00") LocalTime refreshTime,
		boolean businessDaysOnly,
		String timeZone,
		@Schema(nullable = true) LocalDate lastAttemptOn,
		@Schema(nullable = true) String lastFailure) {

	public static ExchangeRateRefreshScheduleDto from(ExchangeRateRefreshScheduleEntity schedule) {
		return new ExchangeRateRefreshScheduleDto(schedule.enabled, schedule.refreshTime, schedule.businessDaysOnly,
				schedule.timeZone, schedule.lastAttemptOn, schedule.lastFailure);
	}
}
