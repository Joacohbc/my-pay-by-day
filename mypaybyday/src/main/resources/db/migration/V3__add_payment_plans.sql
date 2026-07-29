-- Flyway Migration V3: Add Payment Plans and Payment Plan Items

CREATE TABLE payment_plan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(32000),
    plan_type VARCHAR(255) NOT NULL CHECK (plan_type IN ('RECURRING', 'INSTALLMENT', 'CUSTOM', 'GROUP')),
    status VARCHAR(255) NOT NULL CHECK (status IN ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED')),
    total_installments INTEGER,
    total_amount NUMERIC(38,2),
    installment_amount NUMERIC(38,2),
    frequency VARCHAR(255) NOT NULL CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'INSTANT')),
    start_date DATE NOT NULL,
    next_due_date DATE,
    is_automated BOOLEAN NOT NULL DEFAULT 0,
    auto_create_draft BOOLEAN NOT NULL DEFAULT 1,
    origin_node_id BIGINT REFERENCES finance_node(id),
    destination_node_id BIGINT REFERENCES finance_node(id),
    category_id BIGINT REFERENCES category(id),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE payment_plan_tag (
    payment_plan_id BIGINT NOT NULL REFERENCES payment_plan(id) ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
    PRIMARY KEY (payment_plan_id, tag_id)
);

CREATE TABLE payment_plan_item (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_plan_id BIGINT NOT NULL REFERENCES payment_plan(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    expected_date DATE NOT NULL,
    expected_amount NUMERIC(38,2),
    event_id BIGINT REFERENCES finance_event(id) ON DELETE SET NULL,
    draft_id BIGINT REFERENCES draft(id) ON DELETE SET NULL,
    item_status VARCHAR(255) NOT NULL DEFAULT 'PENDING' CHECK (item_status IN ('PENDING', 'DRAFTED', 'PAID', 'SKIPPED', 'OVERDUE')),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX idx_payment_plan_status ON payment_plan(status);
CREATE INDEX idx_payment_plan_item_plan ON payment_plan_item(payment_plan_id);
CREATE INDEX idx_payment_plan_item_status ON payment_plan_item(item_status);
