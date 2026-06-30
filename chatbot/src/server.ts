import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { config } from './config.js';
import { db } from './db/index.js';
import { chatRoute } from './routes/chat.js';
import { memoryRoute } from './routes/memory.js';

const app = new Hono();

app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Accept', 'X-Timezone', 'X-Language'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

app.get('/health', (c) => c.json({ status: 'ok', service: 'mypaybyday-chatbot' }));

app.route('/ai/chat', chatRoute);
app.route('/ai/memory', memoryRoute);

function start(): void {
  db();
  serve({ fetch: app.fetch, port: config.port }, (info) => {
    console.log(`[chatbot] listening on :${info.port} (backend=${config.backendUrl}, large=${config.models.large}, fast=${config.models.fast})`);
  });
}

start();

export { app };
