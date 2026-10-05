package com.mypaybyday.repository;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.ExchangeRateRefreshScheduleEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepository;

@ApplicationScoped
public class ExchangeRateRefreshScheduleRepository implements PanacheRepository<ExchangeRateRefreshScheduleEntity> {

	/** @return the schedule, or a disabled one at the default time in the given zone when none was ever saved */
	public ExchangeRateRefreshScheduleEntity getSchedule(String defaultTimeZone, String defaultLanguage) {
		ExchangeRateRefreshScheduleEntity schedule = findAll().firstResult();
		if (schedule == null) {
			schedule = ExchangeRateRefreshScheduleEntity.builder()
					.timeZone(defaultTimeZone)
					.language(defaultLanguage)
					.build();
			persist(schedule);
		}
		return schedule;
	}
}
