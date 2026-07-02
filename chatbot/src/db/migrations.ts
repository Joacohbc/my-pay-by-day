import type { DatabaseSync } from 'node:sqlite';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS conversation (
  chat_id     TEXT    PRIMARY KEY,
  title       TEXT,
  created_at  TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS conversation_message (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id     TEXT    NOT NULL,
  sequence    INTEGER NOT NULL,
  role        TEXT    NOT NULL,
  message_json TEXT   NOT NULL,
  text        TEXT,
  created_at  TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_conversation_message_chat
  ON conversation_message (chat_id, sequence);

CREATE TABLE IF NOT EXISTS long_term_memory (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  content     TEXT    NOT NULL,
  created_at  TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_task (
  id               TEXT    PRIMARY KEY,
  user_instruction TEXT    NOT NULL,
  execution_mode   TEXT    NOT NULL,
  status           TEXT    NOT NULL,
  progress         INTEGER NOT NULL DEFAULT 0,
  current_step     TEXT,
  lang             TEXT,
  timezone         TEXT,
  cancel_requested INTEGER NOT NULL DEFAULT 0,
  title            TEXT,
  created_at       TEXT    NOT NULL,
  updated_at       TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_task_step (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id     TEXT    NOT NULL,
  sequence    INTEGER NOT NULL,
  type        TEXT    NOT NULL,
  description TEXT,
  content     TEXT,
  created_at  TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_agent_task_step_task
  ON agent_task_step (task_id, sequence);

CREATE TABLE IF NOT EXISTS agent_task_action (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id        TEXT    NOT NULL,
  step_id        INTEGER,
  action_type    TEXT    NOT NULL,
  payload        TEXT,
  status         TEXT    NOT NULL,
  result_message TEXT,
  created_at     TEXT    NOT NULL,
  resolved_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_agent_task_action_task
  ON agent_task_action (task_id);

CREATE TABLE IF NOT EXISTS agent_task_attachment (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id    TEXT    NOT NULL,
  file_name  TEXT    NOT NULL,
  mime_type  TEXT    NOT NULL,
  kind       TEXT    NOT NULL,
  size_bytes INTEGER,
  data       BLOB,
  parsed     INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_agent_task_attachment_task
  ON agent_task_attachment (task_id);
`;

const BACKFILL_CONVERSATION_FROM_MESSAGES = `
INSERT INTO conversation (chat_id, created_at)
SELECT chat_id, MIN(created_at) FROM conversation_message
GROUP BY chat_id
ON CONFLICT(chat_id) DO NOTHING;
`;

function ensureColumn(database: DatabaseSync, table: string, column: string, ddl: string): void {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!columns.some((c) => c.name === column)) database.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

export function runMigrations(database: DatabaseSync): void {
  database.exec(SCHEMA);
  database.exec(BACKFILL_CONVERSATION_FROM_MESSAGES);
  ensureColumn(database, 'agent_task', 'step_budget', 'step_budget INTEGER');
}
