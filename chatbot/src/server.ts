import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { config } from '@/config.js';
import { resolveRequestId } from '@/context.js';
import { db } from '@/db/index.js';
import { recoverTasks } from '@/agent/executor.js';
import { agentTasksRoute } from '@/routes/agent-tasks.js';
import { audioRoute } from '@/routes/audio.js';
import { chatRoute } from '@/routes/chat.js';
import { extractRoute } from '@/routes/extract.js';
import { formChatRoute } from '@/routes/formChat.js';
import { memoryRoute } from '@/routes/memory.js';
import { textRoute } from '@/routes/text.js';
import { logger } from '@/logging/logger.js';
import { runWithRequestContext } from '@/logging/requestStore.js';
import { httpRequestDuration, registry } from '@/metrics.js';

const app = new Hono();

const REQUEST_ID_HEADER = 'X-Request-Id';
const requestLog = logger.child('http');

app.use('*', async (c, next) => {
  const requestId = resolveRequestId(c);
  c.header(REQUEST_ID_HEADER, requestId);
  const method = c.req.method;
  const path = c.req.path;
  const source = c.req.header('X-Source') ?? 'unknown';
  const ip = c.req.header('x-forwarded-for');
  const ua = c.req.header('user-agent');
  const startedAt = performance.now();
  // `source` is bound to the ambient scope so every downstream line shows where the request came from.
  await runWithRequestContext({ requestId, source }, async () => {
    requestLog.info('request received', { method, path, source, ip, ua });
    try {
      await next();
    } finally {
      const durationMs = Math.round(performance.now() - startedAt);
      const status = c.res.status;
      requestLog.info('request completed', { method, path, status, durationMs });
      if (config.metrics.enabled && path !== '/metrics') {
        httpRequestDuration.observe(
          { method, route: path, status: String(status) },
          durationMs / 1000,
        );
      }
    }
  });
});

app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Accept', 'X-Timezone', 'X-Language', 'X-Currency', 'X-Request-Id', 'X-Source'],
  exposeHeaders: ['X-Request-Id'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

app.onError((err, c) => {
  logger.error(`unhandled error on ${c.req.method} ${c.req.path}`, {
    requestId: resolveRequestId(c),
    error: err.message,
    stack: err.stack,
  });
  return c.json({ error: err.message }, 500);
});

app.get('/health', (c) => c.json({ status: 'ok', service: 'mypaybyday-chatbot' }));

if (config.metrics.enabled) {
  app.get('/metrics', async (c) => {
    c.header('Content-Type', registry.contentType);
    return c.body(await registry.metrics());
  });
}

app.route('/ai/chat', chatRoute);
app.route('/ai/memory', memoryRoute);
app.route('/ai/text', textRoute);
app.route('/ai/form-chat', formChatRoute);
app.route('/ai/extract', extractRoute);
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
