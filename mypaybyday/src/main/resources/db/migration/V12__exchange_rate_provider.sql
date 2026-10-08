-- Flyway Migration V12: the provider behind each API quote.
--
-- exchange_rate.provider: name of the provider an API quote came from, so quotes from different providers
--                         stay distinguishable. NULL for manual quotes and for quotes recorded before
--                         providers were told apart.

ALTER TABLE exchange_rate ADD COLUMN provider VARCHAR(64);
