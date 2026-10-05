package com.mypaybyday.service.currency;

import java.time.DateTimeException;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.Set;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.ExchangeRateRefreshScheduleDto;
import com.mypaybyday.dto.UpdateExchangeRateRefreshScheduleDto;
import com.mypaybyday.entity.ExchangeRateRefreshScheduleEntity;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.LanguageContext;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.i18n.TimezoneContext;
import com.mypaybyday.repository.ExchangeRateRefreshScheduleRepository;

/**
 * Decides when quotes are recorded without the user asking: once a day, from the time the user
 * picked, in their own time zone. A day's run happens at most once, whether it succeeds or not, so
 * an unreachable provider is not hit every minute; the user can still refresh by hand.
 */
@ApplicationScoped
public class ExchangeRateRefreshScheduleService {

	private static final Set<DayOfWeek> WEEKEND = Set.of(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY);
	private static final int FAILURE_MAX_LENGTH = 255;
	private static final ZoneId FALLBACK_ZONE = ZoneOffset.UTC;

	private final ExchangeRateRefreshScheduleRepository scheduleRepository;
	private final TimezoneContext timezoneContext;
	private final LanguageContext languageContext;
	private final Messages messages;

	public ExchangeRateRefreshScheduleService(
			ExchangeRateRefreshScheduleRepository scheduleRepository,
			TimezoneContext timezoneContext,
			LanguageContext languageContext,
			Messages messages) {
		this.scheduleRepository = scheduleRepository;
		this.timezoneContext = timezoneContext;
		this.languageContext = languageContext;
		this.messages = messages;
	}

	@Transactional
	public ExchangeRateRefreshScheduleDto getSchedule() {
		return ExchangeRateRefreshScheduleDto.from(currentSchedule());
	}

	/**
	 * Saves the schedule, reading its time in the zone of the user saving it.
	 *
	 * @throws BusinessException if no refresh time is given
	 */
	@Transactional
	public ExchangeRateRefreshScheduleDto updateSchedule(UpdateExchangeRateRefreshScheduleDto update)
			throws BusinessException {
		if (update.refreshTime() == null) {
			throw messages.reject(MsgKey.EXCHANGE_RATE_REFRESH_TIME_REQUIRED);
		}
		ExchangeRateRefreshScheduleEntity schedule = currentSchedule();
		schedule.enabled = update.enabled();
		schedule.refreshTime = update.refreshTime();
		schedule.businessDaysOnly = update.businessDaysOnly();
		schedule.timeZone = timezoneContext.getTimezone();
		schedule.language = languageContext.getLang();
		return ExchangeRateRefreshScheduleDto.from(schedule);
	}

	/**
	 * Claims today's automatic run when it is due, so a second check the same day finds nothing to do.
	 *
	 * @return the language the run's messages must be written in, when a run is due now
	 */
	@Transactional
	public Optional<String> claimDueRun() {
		ExchangeRateRefreshScheduleEntity schedule = currentSchedule();
		ZonedDateTime now = ZonedDateTime.now(zoneOf(schedule));
		if (!isDue(schedule, now)) {
			return Optional.empty();
		}
		schedule.lastAttemptOn = now.toLocalDate();
		return Optional.of(schedule.language);
	}

	/** @param failure why the claimed run failed, or {@code null} when it succeeded */
	@Transactional
	public void recordRunOutcome(String failure) {
		boolean isTooLong = failure != null && failure.length() > FAILURE_MAX_LENGTH;
		currentSchedule().lastFailure = isTooLong ? failure.substring(0, FAILURE_MAX_LENGTH) : failure;
	}

	/**
	 * A run is due once the day's refresh time has passed, on an allowed day, if none ran that day.
	 * Checking "has passed" rather than "is now" lets a run missed while the server was down still
	 * happen later the same day.
	 */
	static boolean isDue(ExchangeRateRefreshScheduleEntity schedule, ZonedDateTime now) {
		LocalDate today = now.toLocalDate();
		boolean isSkippedDay = schedule.businessDaysOnly && WEEKEND.contains(now.getDayOfWeek());
		boolean hasRunToday = today.equals(schedule.lastAttemptOn);
		boolean hasReachedRefreshTime = !now.toLocalTime().isBefore(schedule.refreshTime);
		return schedule.enabled && !isSkippedDay && !hasRunToday && hasReachedRefreshTime;
	}

	private ExchangeRateRefreshScheduleEntity currentSchedule() {
		return scheduleRepository.getSchedule(timezoneContext.getDefaultTimezone(), languageContext.getDefaultLanguage());
	}

	private static ZoneId zoneOf(ExchangeRateRefreshScheduleEntity schedule) {
		try {
			return ZoneId.of(schedule.timeZone);
		} catch (DateTimeException e) {
			return FALLBACK_ZONE;
		}
	}
}
