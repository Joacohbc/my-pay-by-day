-- Flyway Migration V8: exchange rates frozen per transaction.
--
-- currency:               the currencies the user works with; "principal" ones are the currencies
--                         every transaction is converted into.
-- exchange_rate:          append-only history of quotes, each one "units of currency per 1 unit of
--                         base_currency". The newest row per currency is the current rate.
-- transaction_conversion: the rate frozen on a transaction for one target currency. Updating a
--                         quote later never touches these rows.

CREATE TABLE currency (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(3) NOT NULL UNIQUE,
    principal BOOLEAN NOT NULL DEFAULT 0,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE exchange_rate (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    currency VARCHAR(3) NOT NULL,
    base_currency VARCHAR(3) NOT NULL,
    units_per_base NUMERIC(38,12) NOT NULL,
    source VARCHAR(255) NOT NULL CHECK (source IN ('MANUAL', 'API')),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exchange_rate_lookup ON exchange_rate (base_currency, currency, id);

CREATE TABLE transaction_conversion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id BIGINT NOT NULL REFERENCES finance_transaction(id) ON DELETE CASCADE,
    currency VARCHAR(3) NOT NULL,
    rate NUMERIC(38,12) NOT NULL,
    origin VARCHAR(255) NOT NULL CHECK (origin IN ('AT_ENTRY', 'RETROACTIVE')),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE (transaction_id, currency)
);

CREATE INDEX IF NOT EXISTS idx_transaction_conversion_currency ON transaction_conversion (currency);

-- system_job.job_category carries a CHECK constraint listing every category, and SQLite cannot
-- alter a constraint, so the table is recreated to admit CURRENCY_CONVERSION_BACKFILL.

CREATE TABLE system_job_new (
    created_at TIMESTAMP,
    id INTEGER,
    next_execution_date TIMESTAMP NOT NULL,
    updated_at TIMESTAMP,
    entity_id VARCHAR(255),
    job_category VARCHAR(255) NOT NULL CHECK (job_category IN ('SUBSCRIPTION_PROCESSOR', 'DUPLICATE_DETECTION', 'CURRENCY_CONVERSION_BACKFILL')),
    message VARCHAR(255),
    status VARCHAR(255) NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    PRIMARY KEY (id)
);

INSERT INTO system_job_new (created_at, id, next_execution_date, updated_at, entity_id, job_category, message, status)
SELECT created_at, id, next_execution_date, updated_at, entity_id, job_category, message, status FROM system_job;

DROP TABLE system_job;
ALTER TABLE system_job_new RENAME TO system_job;
