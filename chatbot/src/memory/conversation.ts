import type { ModelMessage } from 'ai';
import { db, nowIso } from '../db/index.js';

interface Row {
  message_json: string;
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

  append(chatId: string, messages: ModelMessage[]): void {
    if (messages.length === 0) return;
    const next = db()
      .prepare('SELECT COALESCE(MAX(sequence), -1) + 1 AS next FROM conversation_message WHERE chat_id = ?')
      .get(chatId) as { next: number };
    let sequence = next.next;
    const insert = db().prepare(
      'INSERT INTO conversation_message (chat_id, sequence, role, message_json, text, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    );
    const createdAt = nowIso();
    for (const message of messages) {
      insert.run(chatId, sequence++, message.role, JSON.stringify(message), textOf(message), createdAt);
    }
  },

  replace(chatId: string, messages: ModelMessage[]): void {
    this.clear(chatId);
    this.append(chatId, messages);
  },

  clear(chatId: string): void {
    db().prepare('DELETE FROM conversation_message WHERE chat_id = ?').run(chatId);
  },

  count(chatId: string): number {
    const row = db()
      .prepare('SELECT COUNT(*) AS n FROM conversation_message WHERE chat_id = ?')
      .get(chatId) as { n: number };
    return row.n;
  },

  /** Removes every message from the most recent user message that contains the given text. */
  trim(chatId: string, textToMatch: string): void {
    const messages = this.load(chatId);
    let trimIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === 'user' && textOf(message).includes(textToMatch)) {
        trimIndex = i;
        break;
      }
    }
    if (trimIndex >= 0) {
      this.replace(chatId, messages.slice(0, trimIndex));
    }
  },
};
