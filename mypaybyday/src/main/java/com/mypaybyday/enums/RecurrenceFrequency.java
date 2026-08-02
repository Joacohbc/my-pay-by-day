package com.mypaybyday.enums;

import java.time.LocalDate;

public enum RecurrenceFrequency {
	DAILY,
	WEEKLY,
	MONTHLY,
	YEARLY,
	INSTANT;

	/**
	 * @param cycles how many whole cycles to move forward
	 * @return the date reached after the given number of cycles, or the same date for
	 *         {@link #INSTANT}, which has no cadence to advance along
	 */
	public LocalDate advance(LocalDate date, int cycles) {
		return switch (this) {
			case DAILY -> date.plusDays(cycles);
			case WEEKLY -> date.plusWeeks(cycles);
			case MONTHLY -> date.plusMonths(cycles);
			case YEARLY -> date.plusYears(cycles);
			case INSTANT -> date;
		};
	}

	public boolean isSchedulable() {
		return this != INSTANT;
	}
}
