-- Flyway Migration V3: Add Payment Plans and Payment Plan Items

CREATE TABLE payment_plan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    plan_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    total_installments INTEGER,
    total_amount DECIMAL(19, 4),
    installment_amount DECIMAL(19, 4),
    frequency VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    next_due_date DATE,
    is_automated BOOLEAN NOT NULL DEFAULT 0,
    auto_create_draft BOOLEAN NOT NULL DEFAULT 1,
    origin_node_id INTEGER REFERENCES finance_node(id),
    destination_node_id INTEGER REFERENCES finance_node(id),
    category_id INTEGER REFERENCES category(id),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE payment_plan_tag (
    payment_plan_id INTEGER NOT NULL REFERENCES payment_plan(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
    PRIMARY KEY (payment_plan_id, tag_id)
);

CREATE TABLE payment_plan_item (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_plan_id INTEGER NOT NULL REFERENCES payment_plan(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    expected_date DATE NOT NULL,
    expected_amount DECIMAL(19, 4),
    event_id INTEGER REFERENCES finance_event(id) ON DELETE SET NULL,
    draft_id INTEGER REFERENCES draft(id) ON DELETE SET NULL,
    item_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_payment_plan_status ON payment_plan(status);
CREATE INDEX idx_payment_plan_item_plan ON payment_plan_item(payment_plan_id);
CREATE INDEX idx_payment_plan_item_status ON payment_plan_item(item_status);
