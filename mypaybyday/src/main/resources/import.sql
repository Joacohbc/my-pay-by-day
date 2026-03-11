-- Indexes managed manually with IF NOT EXISTS to avoid SQLite errors on restart.
-- These were previously defined via @Index annotations on JPA entities.

-- FinanceLineItem indexes
CREATE INDEX IF NOT EXISTS idx_finance_line_item_transaction ON FinanceLineItem (transaction_id);
CREATE INDEX IF NOT EXISTS idx_finance_line_item_node ON FinanceLineItem (finance_node_id);

-- FinanceEvent indexes
CREATE INDEX IF NOT EXISTS idx_finance_event_transaction ON FinanceEvent (transaction_id);
CREATE INDEX IF NOT EXISTS idx_finance_event_category ON FinanceEvent (category_id);

-- event_tag join table indexes
CREATE INDEX IF NOT EXISTS idx_event_tag_event ON event_tag (event_id);
CREATE INDEX IF NOT EXISTS idx_event_tag_tag ON event_tag (tag_id);

-- FinanceTransaction indexes
CREATE INDEX IF NOT EXISTS idx_finance_transaction_date ON FinanceTransaction (transactionDate);

-- TimePeriod indexes
CREATE INDEX IF NOT EXISTS idx_time_period_dates ON TimePeriod (startDate, endDate);
