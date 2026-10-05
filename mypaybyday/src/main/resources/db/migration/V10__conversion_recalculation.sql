-- Flyway Migration V10: retroactive recalculation of frozen conversions.
--
-- conversion_recalculation: a request to replace, with a rate the user chose, the conversion frozen
--                           on every past transaction recorded in source_currency into target_currency,
--                           optionally limited to a date range. A background job works through it.

CREATE TABLE conversion_recalculation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_currency VARCHAR(3) NOT NULL,
    target_currency VARCHAR(3) NOT NULL,
    rate NUMERIC(38,12) NOT NULL,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    status VARCHAR(255) NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    recalculated_count INTEGER NOT NULL DEFAULT 0,
    message VARCHAR(255),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversion_recalculation_status ON conversion_recalculation (status);

-- transaction_conversion.origin carries a CHECK constraint listing every origin, and SQLite cannot
-- alter a constraint, so the table is recreated to admit RECALCULATED.

CREATE TABLE transaction_conversion_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id BIGINT NOT NULL REFERENCES finance_transaction(id) ON DELETE CASCADE,
    currency VARCHAR(3) NOT NULL,
    rate NUMERIC(38,12) NOT NULL,
    origin VARCHAR(255) NOT NULL CHECK (origin IN ('AT_ENTRY', 'RETROACTIVE', 'RECALCULATED')),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE (transaction_id, currency)
);

INSERT INTO transaction_conversion_new (id, transaction_id, currency, rate, origin, created_at, updated_at)
SELECT id, transaction_id, currency, rate, origin, created_at, updated_at FROM transaction_conversion;

DROP TABLE transaction_conversion;
ALTER TABLE transaction_conversion_new RENAME TO transaction_conversion;

CREATE INDEX IF NOT EXISTS idx_transaction_conversion_currency ON transaction_conversion (currency);
