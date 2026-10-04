-- Flyway Migration V9: the base currency becomes a user choice.
--
-- currency.base marks the currency every exchange rate is quoted against. No row is marked on
-- existing databases: until the user picks one, mypaybyday.exchange-rate.base-currency stays the base.

ALTER TABLE currency ADD COLUMN base BOOLEAN NOT NULL DEFAULT 0;
