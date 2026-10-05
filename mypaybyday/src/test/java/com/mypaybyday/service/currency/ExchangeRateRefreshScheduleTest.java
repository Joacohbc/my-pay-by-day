package com.mypaybyday.service.currency;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;

import jakarta.inject.Inject;

import com.mypaybyday.dto.ExchangeRateRefreshScheduleDto;
import com.mypaybyday.dto.UpdateExchangeRateRefreshScheduleDto;
import com.mypaybyday.entity.ExchangeRateRefreshScheduleEntity;
import com.mypaybyday.exception.BusinessException;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.TestTransaction;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@QuarkusTest
class ExchangeRateRefreshScheduleTest {

	private static final ZoneId MONTEVIDEO = ZoneId.of("America/Montevideo");
	private static final LocalTime SIX_PM = LocalTime.of(18, 0);
	private static final LocalDate MONDAY = LocalDate.of(2026, 10, 5);
	private static final LocalDate SATURDAY = LocalDate.of(2026, 10, 10);

	@Inject
	ExchangeRateRefreshScheduleService scheduleService;

	@Test
	void isDueOnceTheRefreshTimeHasPassed() {
		ExchangeRateRefreshScheduleEntity schedule = enabledAtSixPm();

		assertFalse(ExchangeRateRefreshScheduleService.isDue(schedule, at(MONDAY, 17, 59)));
		assertTrue(ExchangeRateRefreshScheduleService.isDue(schedule, at(MONDAY, 18, 0)));
		assertTrue(ExchangeRateRefreshScheduleService.isDue(schedule, at(MONDAY, 22, 30)));
	}

	@Test
	void runsAtMostOnceADay() {
		ExchangeRateRefreshScheduleEntity schedule = enabledAtSixPm();
		schedule.lastAttemptOn = MONDAY;

		assertFalse(ExchangeRateRefreshScheduleService.isDue(schedule, at(MONDAY, 20, 0)));
		assertTrue(ExchangeRateRefreshScheduleService.isDue(schedule, at(MONDAY.plusDays(1), 18, 0)));
	}

	@Test
	void skipsWeekendsOnlyWhenAskedTo() {
		ExchangeRateRefreshScheduleEntity schedule = enabledAtSixPm();

		assertFalse(ExchangeRateRefreshScheduleService.isDue(schedule, at(SATURDAY, 19, 0)));
		schedule.businessDaysOnly = false;
		assertTrue(ExchangeRateRefreshScheduleService.isDue(schedule, at(SATURDAY, 19, 0)));
	}

	@Test
	void neverRunsWhileDisabled() {
		ExchangeRateRefreshScheduleEntity schedule = enabledAtSixPm();
		schedule.enabled = false;

		assertFalse(ExchangeRateRefreshScheduleService.isDue(schedule, at(MONDAY, 19, 0)));
	}

	@Test
	@TestTransaction
	void aSavedScheduleIsReadBack() throws BusinessException {
		scheduleService.updateSchedule(new UpdateExchangeRateRefreshScheduleDto(true, LocalTime.of(17, 30), false));

		ExchangeRateRefreshScheduleDto saved = scheduleService.getSchedule();
		assertTrue(saved.enabled());
		assertEquals(LocalTime.of(17, 30), saved.refreshTime());
		assertFalse(saved.businessDaysOnly());
	}

	@Test
	@TestTransaction
	void aScheduleWithoutATimeIsRejected() {
		assertThrows(BusinessException.class,
				() -> scheduleService.updateSchedule(new UpdateExchangeRateRefreshScheduleDto(true, null, true)));
	}

	private static ExchangeRateRefreshScheduleEntity enabledAtSixPm() {
		return ExchangeRateRefreshScheduleEntity.builder()
				.enabled(true)
				.refreshTime(SIX_PM)
				.businessDaysOnly(true)
				.timeZone(MONTEVIDEO.getId())
				.language("es")
				.build();
	}

	private static ZonedDateTime at(LocalDate day, int hour, int minute) {
		return LocalDateTime.of(day, LocalTime.of(hour, minute)).atZone(MONTEVIDEO);
	}
}
