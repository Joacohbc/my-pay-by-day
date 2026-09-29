-- Flyway Migration V7: multi-currency.
--
-- Every monetary value carries its own ISO-4217 code and is never converted, so the code sits
-- in a column next to each amount rather than on a shared parent.
--
-- The code is stored in plain text while the amount beside it stays encrypted: a balance has to
-- be grouped by currency, and an encrypted column cannot appear in GROUP BY.
--
-- Rows written before this migration are all denominated in one currency, named by the
-- ${default-currency} placeholder (quarkus.flyway.placeholders.default-currency, from
-- APP_DEFAULT_CURRENCY) so a ledger that is not in USD is backfilled with the right code
-- instead of being mislabelled — without exchange rates, a wrong code cannot be converted away.

ALTER TABLE finance_line_item ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT '${default-currency}';
ALTER TABLE time_period_budget ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT '${default-currency}';

ALTER TABLE finance_node ADD COLUMN currency VARCHAR(3);
ALTER TABLE time_period ADD COLUMN currency VARCHAR(3);
ALTER TABLE payment_plan ADD COLUMN currency VARCHAR(3);
ALTER TABLE template ADD COLUMN currency VARCHAR(3);
ALTER TABLE subscription ADD COLUMN currency VARCHAR(3);

-- A nullable currency is only meaningful next to an amount that exists; leaving it NULL elsewhere
-- keeps "this node holds no particular currency" distinguishable from "this node holds USD".
UPDATE time_period SET currency = '${default-currency}' WHERE budget_limit IS NOT NULL;
UPDATE payment_plan SET currency = '${default-currency}' WHERE total_amount IS NOT NULL OR installment_amount IS NOT NULL;
UPDATE template SET currency = '${default-currency}' WHERE modifier_type = 'FIXED' AND modifier_value IS NOT NULL;
UPDATE subscription SET currency = '${default-currency}' WHERE modifier_value IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_line_item_currency ON finance_line_item (currency);
