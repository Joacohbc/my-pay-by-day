import { db, nowIso } from '../db/index.js';

export interface MemoryRow {
  id: number;
  content: string;
  created_at: string;
  updated_at: string;
}

/** Long-term memory that persists across conversations (user facts and preferences). */
export const longTermMemory = {
  list(): MemoryRow[] {
    return db()
      .prepare('SELECT id, content, created_at, updated_at FROM long_term_memory ORDER BY updated_at DESC')
      .all() as unknown as MemoryRow[];
  },

  add(content: string): MemoryRow {
    const now = nowIso();
    const info = db()
      .prepare('INSERT INTO long_term_memory (content, created_at, updated_at) VALUES (?, ?, ?)')
      .run(content.trim(), now, now);
    return {
      id: Number(info.lastInsertRowid),
      content: content.trim(),
      created_at: now,
      updated_at: now,
    };
  },

  update(id: number, content: string): void {
    db()
      .prepare('UPDATE long_term_memory SET content = ?, updated_at = ? WHERE id = ?')
      .run(content.trim(), nowIso(), id);
  },

  remove(id: number): void {
    db().prepare('DELETE FROM long_term_memory WHERE id = ?').run(id);
  },

  /** Plain memory contents used to ground the system prompt. */
  contents(limit = 50): string[] {
    return this.list()
      .slice(0, limit)
      .map((row) => row.content);
  },
};
