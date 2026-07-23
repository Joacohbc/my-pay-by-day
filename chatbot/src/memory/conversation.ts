import type { ModelMessage } from 'ai';
import { db, nowIso } from '@/db/index.js';
import { agentStore } from '@/agent/store.js';
import { parseDisplayJson, type DisplayMessage } from '@/memory/display.js';

interface Row {
  message_json: string;
}

export interface SequencedMessage {
  sequence: number;
  message: ModelMessage;
}

export interface StoredMessage {
  message: ModelMessage;
  display: DisplayMessage | null;
}

export interface ConversationSummary {
  summary: string;
  upToSequence: number;
}

/** Cached fast-model recap of an entire conversation, plus the message count it was generated from
 * (used to detect staleness — regenerate only once new messages arrive beyond that count). */
export interface ConversationRecap {
  recap: string;
  upToCount: number;
}

export interface ChatSummary {
  chatId: string;
  title: string | null;
  preview: string;
  lastMessageAt: string;
  messageCount: number;
}

export function textOf(message: ModelMessage): string {
  if (typeof message.content === 'string') return message.content;
  if (Array.isArray(message.content)) {
    return message.content
      .map((part) => ('text' in part && typeof part.text === 'string' ? part.text : ''))
      .join('');
  }
  return '';
}

/** Persistent per-chat conversation memory backed by SQLite (replaces the Java DbChatMemoryStore). */
export const conversationMemory = {
  load(chatId: string): ModelMessage[] {
    const rows = db()
      .prepare('SELECT message_json FROM conversation_message WHERE chat_id = ? ORDER BY sequence ASC')
      .all(chatId) as unknown as Row[];
    return rows.map((row) => JSON.parse(row.message_json) as ModelMessage);
  },

  /** Loads messages with a sequence strictly greater than `afterSequence`, keeping their sequence. */
  loadAfterSequence(chatId: string, afterSequence: number): SequencedMessage[] {
    const rows = db()
      .prepare(
        'SELECT sequence, message_json FROM conversation_message WHERE chat_id = ? AND sequence > ? ORDER BY sequence ASC',
      )
      .all(chatId, afterSequence) as unknown as { sequence: number; message_json: string }[];
    return rows.map((row) => ({ sequence: row.sequence, message: JSON.parse(row.message_json) as ModelMessage }));
  },

  getSummary(chatId: string): ConversationSummary | null {
    const row = db()
      .prepare('SELECT summary, summary_up_to_sequence AS upTo FROM conversation WHERE chat_id = ?')
      .get(chatId) as { summary: string | null; upTo: number | null } | undefined;
    if (!row || row.summary == null || row.upTo == null) return null;
    return { summary: row.summary, upToSequence: row.upTo };
  },

  setSummary(chatId: string, summary: string, upToSequence: number): void {
    db()
      .prepare('UPDATE conversation SET summary = ?, summary_up_to_sequence = ? WHERE chat_id = ?')
      .run(summary, upToSequence, chatId);
  },

  clearSummary(chatId: string): void {
    db().prepare('UPDATE conversation SET summary = NULL, summary_up_to_sequence = NULL WHERE chat_id = ?').run(chatId);
  },

  getRecap(chatId: string): ConversationRecap | null {
    const row = db()
      .prepare('SELECT recap, recap_up_to_count AS upTo FROM conversation WHERE chat_id = ?')
      .get(chatId) as { recap: string | null; upTo: number | null } | undefined;
    if (!row || row.recap == null || row.upTo == null) return null;
    return { recap: row.recap, upToCount: row.upTo };
  },

  setRecap(chatId: string, recap: string, upToCount: number): void {
    db()
      .prepare('INSERT INTO conversation (chat_id, created_at) VALUES (?, ?) ON CONFLICT(chat_id) DO NOTHING')
      .run(chatId, nowIso());
    db().prepare('UPDATE conversation SET recap = ?, recap_up_to_count = ? WHERE chat_id = ?').run(recap, upToCount, chatId);
  },

  /** Loads messages together with their persisted display representation (null for legacy rows and tool rows). */
  loadWithDisplay(chatId: string): StoredMessage[] {
    const rows = db()
      .prepare('SELECT message_json, display_json FROM conversation_message WHERE chat_id = ? ORDER BY sequence ASC')
      .all(chatId) as unknown as { message_json: string; display_json: string | null }[];
    return rows.map((row) => ({
      message: JSON.parse(row.message_json) as ModelMessage,
      display: parseDisplayJson(row.display_json),
    }));
  },

  append(chatId: string, messages: ModelMessage[], displays?: (DisplayMessage | null)[]): void {
    if (messages.length === 0) return;
    db()
      .prepare('INSERT INTO conversation (chat_id, created_at) VALUES (?, ?) ON CONFLICT(chat_id) DO NOTHING')
      .run(chatId, nowIso());

    const next = db()
      .prepare('SELECT COALESCE(MAX(sequence), -1) + 1 AS next FROM conversation_message WHERE chat_id = ?')
      .get(chatId) as { next: number };
    let sequence = next.next;
    const insert = db().prepare(
      'INSERT INTO conversation_message (chat_id, sequence, role, message_json, display_json, text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    );
    const createdAt = nowIso();
    messages.forEach((message, index) => {
      const display = displays?.[index] ?? null;
      insert.run(
        chatId,
        sequence++,
        message.role,
        JSON.stringify(message),
        display == null ? null : JSON.stringify(display),
        textOf(message),
        createdAt,
      );
    });
  },

  replace(chatId: string, messages: ModelMessage[], displays?: (DisplayMessage | null)[]): void {
    this.clearMessages(chatId);
    this.append(chatId, messages, displays);
  },

  /** Removes every message in the chat but keeps the conversation entity (and its title). Used by trim/replace. */
  clearMessages(chatId: string): void {
    db().prepare('DELETE FROM conversation_message WHERE chat_id = ?').run(chatId);
    this.clearSummary(chatId);
  },

  /** Deletes the conversation entity along with all of its messages. */
  deleteChat(chatId: string): void {
    // Find all referenced background tasks in this chat's messages
    const rows = db()
      .prepare("SELECT text FROM conversation_message WHERE chat_id = ? AND text LIKE '%[Background Task: %'")
      .all(chatId) as { text: string | null }[];

    const taskIds = new Set<string>();
    const taskRegex = /\[Background Task: ([a-f0-9-]+)\]/gi;
    for (const row of rows) {
      if (row.text) {
        let match;
        taskRegex.lastIndex = 0;
        while ((match = taskRegex.exec(row.text)) !== null) {
          taskIds.add(match[1]);
        }
      }
    }

    // Clear messages and conversation
    this.clearMessages(chatId);
    db().prepare('DELETE FROM conversation WHERE chat_id = ?').run(chatId);

    // Delete associated tasks in cascade
    for (const taskId of taskIds) {
      agentStore.delete(taskId);
    }
  },

  count(chatId: string): number {
    const row = db()
      .prepare('SELECT COUNT(*) AS n FROM conversation_message WHERE chat_id = ?')
      .get(chatId) as { n: number };
    return row.n;
  },

  getTitle(chatId: string): string | null {
    const row = db().prepare('SELECT title FROM conversation WHERE chat_id = ?').get(chatId) as
      | { title: string | null }
      | undefined;
    return row?.title ?? null;
  },

  setTitle(chatId: string, title: string): void {
    db().prepare('UPDATE conversation SET title = ? WHERE chat_id = ?').run(title, chatId);
  },

  /** Removes every message from the most recent message (of any role) that contains the given text. */
  trim(chatId: string, textToMatch: string): void {
    const stored = this.loadWithDisplay(chatId);
    let trimIndex = -1;
    for (let i = stored.length - 1; i >= 0; i--) {
      const { message } = stored[i];
      if (textOf(message).includes(textToMatch)) {
        trimIndex = i;
        break;
      }
    }
    if (trimIndex >= 0) {
      const kept = stored.slice(0, trimIndex);
      this.replace(
        chatId,
        kept.map((entry) => entry.message),
        kept.map((entry) => entry.display),
      );
    }
  },

  listAll(): ChatSummary[] {
    const query = `
      SELECT
        c.chat_id      AS chatId,
        c.title         AS title,
        m.message_count AS messageCount,
        m.last_at       AS lastMessageAt,
        COALESCE(p.text, '')  AS preview
      FROM conversation c
      JOIN (
        SELECT chat_id,
               COUNT(*)        AS message_count,
               MAX(created_at) AS last_at
        FROM conversation_message
        GROUP BY chat_id
      ) m ON m.chat_id = c.chat_id
      LEFT JOIN (
        SELECT chat_id, text
        FROM conversation_message
        WHERE role = 'user' AND text IS NOT NULL AND text != ''
        GROUP BY chat_id
        HAVING sequence = MIN(sequence)
      ) p ON p.chat_id = c.chat_id
      WHERE c.chat_id NOT IN (SELECT id FROM agent_task)
      ORDER BY m.last_at DESC
    `;
    return db().prepare(query).all() as unknown as ChatSummary[];
  },
};
