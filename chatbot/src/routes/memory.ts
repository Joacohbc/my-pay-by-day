import { Hono } from 'hono';
import { longTermMemory } from '../memory/longTerm.js';

export const memoryRoute = new Hono();

memoryRoute.get('/', (c) => c.json(longTermMemory.list()));

memoryRoute.post('/', async (c) => {
  const { content } = (await c.req.json()) as { content?: string };
  if (!content || !content.trim()) return c.json({ error: 'content is required' }, 400);
  return c.json(longTermMemory.add(content), 201);
});

memoryRoute.put('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const { content } = (await c.req.json()) as { content?: string };
  if (!content || !content.trim()) return c.json({ error: 'content is required' }, 400);
  longTermMemory.update(id, content);
  return c.body(null, 200);
});

memoryRoute.delete('/:id', (c) => {
  longTermMemory.remove(Number(c.req.param('id')));
  return c.body(null, 204);
});
