import { collectDefaultMetrics, Histogram, Registry } from 'prom-client';

/** Prometheus registry for the chatbot, scraped by Prometheus at `GET /metrics`. */
export const registry = new Registry();

collectDefaultMetrics({ register: registry, prefix: 'chatbot_' });

/** Wall-clock duration of every HTTP request, labelled for rate/latency/error dashboards. */
export const httpRequestDuration = new Histogram({
  name: 'chatbot_http_request_duration_seconds',
  help: 'Duration of HTTP requests handled by the chatbot in seconds.',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
  registers: [registry],
});
