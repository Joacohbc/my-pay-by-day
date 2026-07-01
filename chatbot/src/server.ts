import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { config } from '@/config.js';
import { db } from '@/db/index.js';
import { recoverTasks } from '@/agent/executor.js';
import { agentTasksRoute } from '@/routes/agent-tasks.js';
import { audioRoute } from '@/routes/audio.js';
import { chatRoute } from '@/routes/chat.js';
import { eventsRoute, extractRoute } from '@/routes/extract.js';
import { memoryRoute } from '@/routes/memory.js';
import { textRoute } from '@/routes/text.js';
import { logger } from '@/logging/logger.js';

const app = new Hono();

app.use('*', honoLogger((str) => logger.info(str)));
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Accept', 'X-Timezone', 'X-Language'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

app.onError((err, c) => {
  logger.error(`unhandled error on ${c.req.method} ${c.req.path}`, { error: err.message });
  return c.json({ error: err.message }, 500);
});

app.get('/health', (c) => c.json({ status: 'ok', service: 'mypaybyday-chatbot' }));

app.route('/ai/chat', chatRoute);
app.route('/ai/memory', memoryRoute);
app.route('/ai/text', textRoute);
app.route('/ai/extract', extractRoute);
app.route('/ai/events', eventsRoute);
app.route('/ai/audio', audioRoute);
app.route('/agent-tasks', agentTasksRoute);

function start(): void {
  db();
  recoverTasks();
  serve({ fetch: app.fetch, port: config.port }, (info) => {
    logger.info(`listening on :${info.port}`, {
      port: info.port,
      backend: config.backendUrl,
      largeModel: config.models.large,
      fastModel: config.models.fast,
    });
  });
}

start();

export { app };
