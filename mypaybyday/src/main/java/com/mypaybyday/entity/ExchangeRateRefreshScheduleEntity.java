package com.mypaybyday.entity;

import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.validation.constraints.NotNull;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * When the exchange rate provider's quotes are recorded without the user asking. There is only
 * ever one row.
 */
@Entity(name = "ExchangeRateRefreshSchedule")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExchangeRateRefreshScheduleEntity extends BaseEntity {

	public static final int TIME_ZONE_MAX_LENGTH = 64;
	public static final int LANGUAGE_MAX_LENGTH = 8;

	@Builder.Default
	@NotNull
	public Boolean enabled = false;

	/** Wall-clock time in {@link #timeZone} from which the day's refresh runs. */
	@Builder.Default
	@NotNull
	@Column(columnDefinition = "TIME")
	public LocalTime refreshTime = LocalTime.of(18, 0);

	/** Banks only update their board on business days, so a weekend refresh would record Friday's quote again. */
	@Builder.Default
	@NotNull
	public Boolean businessDaysOnly = true;

	/** Zone of the user who set the schedule, so the refresh time is theirs and not the server's. */
	@NotNull
	@Column(length = TIME_ZONE_MAX_LENGTH)
	public String timeZone;

	/** Language of the user who set the schedule, in which a failed run's message is written. */
	@NotNull
	@Column(length = LANGUAGE_MAX_LENGTH)
	public String language;

	/** Day of the last automatic run, successful or not: at most one runs per day. */
	public LocalDate lastAttemptOn;

	/** Why the last automatic run failed; {@code null} when it succeeded. */
	public String lastFailure;
}
