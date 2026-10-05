-- Flyway Migration V11: automatic exchange rate refresh.
--
-- exchange_rate_refresh_schedule: the single row saying whether, and at what time of day, a background
--                                 job records the configured provider's quotes on its own. The time is a
--                                 wall-clock time in time_zone, the zone of the user who set it.

CREATE TABLE exchange_rate_refresh_schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    enabled BOOLEAN NOT NULL DEFAULT 0,
    refresh_time TIME NOT NULL,
    business_days_only BOOLEAN NOT NULL DEFAULT 1,
    time_zone VARCHAR(64) NOT NULL,
    language VARCHAR(8) NOT NULL,
    last_attempt_on DATE,
    last_failure VARCHAR(255),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
