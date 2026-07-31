-- Flyway Migration V5: Payment plans point at a Template instead of carrying their own nodes,
-- gain an explicit end date, allow a null frequency (custom plans have no cadence), and their
-- items drop the per-item amount.
--
-- SQLite cannot drop a column, relax NOT NULL or change a foreign key in place, so both tables
-- are rebuilt with the create-new-table -> copy -> drop -> rename pattern.

CREATE TABLE payment_plan_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(32000),
    plan_type VARCHAR(255) NOT NULL CHECK (plan_type IN ('RECURRING', 'INSTALLMENT', 'CUSTOM', 'GROUP')),
    status VARCHAR(255) NOT NULL CHECK (status IN ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED')),
    total_installments INTEGER,
    total_amount NUMERIC(38,2),
    installment_amount NUMERIC(38,2),
    frequency VARCHAR(255) CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'INSTANT')),
    start_date DATE NOT NULL,
    end_date DATE,
    next_due_date DATE,
    is_automated BOOLEAN NOT NULL DEFAULT 0,
    auto_create_draft BOOLEAN NOT NULL DEFAULT 1,
    template_id BIGINT REFERENCES template(id),
    category_id BIGINT REFERENCES category(id),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

INSERT INTO payment_plan_new (
    id, name, description, plan_type, status, total_installments, total_amount, installment_amount,
    frequency, start_date, end_date, next_due_date, is_automated, auto_create_draft, template_id,
    category_id, created_at, updated_at
)
SELECT
    id, name, description, plan_type, status,
    CASE WHEN plan_type = 'INSTALLMENT' THEN total_installments END,
    CASE WHEN plan_type = 'INSTALLMENT' THEN total_amount END,
    CASE WHEN plan_type IN ('INSTALLMENT', 'RECURRING') THEN installment_amount END,
    CASE WHEN plan_type IN ('INSTALLMENT', 'RECURRING') THEN frequency END,
    start_date,
    NULL,
    CASE WHEN plan_type IN ('INSTALLMENT', 'RECURRING') THEN next_due_date END,
    0,
    auto_create_draft,
    NULL,
    category_id, created_at, updated_at
FROM payment_plan;

DROP TABLE payment_plan;
ALTER TABLE payment_plan_new RENAME TO payment_plan;

CREATE TABLE payment_plan_item_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_plan_id BIGINT NOT NULL REFERENCES payment_plan(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    expected_date DATE NOT NULL,
    event_id BIGINT REFERENCES finance_event(id) ON DELETE SET NULL,
    draft_id BIGINT REFERENCES draft(id) ON DELETE SET NULL,
    item_status VARCHAR(255) NOT NULL DEFAULT 'PENDING' CHECK (item_status IN ('PENDING', 'DRAFTED', 'PAID', 'SKIPPED', 'OVERDUE')),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

INSERT INTO payment_plan_item_new (
    id, payment_plan_id, installment_number, expected_date, event_id, draft_id, item_status,
    created_at, updated_at
)
SELECT id, payment_plan_id, installment_number, expected_date, event_id, draft_id, item_status,
       created_at, updated_at
FROM payment_plan_item;

DROP TABLE payment_plan_item;
ALTER TABLE payment_plan_item_new RENAME TO payment_plan_item;

-- Custom plans predate the mandatory window, so they are closed at their last scheduled item.
UPDATE payment_plan
SET end_date = COALESCE(
    (SELECT MAX(expected_date) FROM payment_plan_item WHERE payment_plan_id = payment_plan.id),
    start_date
)
WHERE plan_type = 'CUSTOM';

CREATE INDEX idx_payment_plan_status ON payment_plan(status);
CREATE INDEX idx_payment_plan_item_plan ON payment_plan_item(payment_plan_id);
CREATE INDEX idx_payment_plan_item_status ON payment_plan_item(item_status);
