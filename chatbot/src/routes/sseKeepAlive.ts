const KEEP_ALIVE_INTERVAL_MS = 25_000;
const KEEP_ALIVE_COMMENT = new TextEncoder().encode(': keep-alive\n\n');

/**
 * Injects SSE comment lines into a streaming response while the model is silent.
 *
 * Proxies between the browser and this service (Cloudflare closes proxied
 * connections after ~100s without data) kill the chat stream during long tool
 * executions, so the reply never reaches the client. SSE comments are ignored
 * by every spec-compliant parser, so they keep the connection alive without
 * altering the UI message stream.
 */
export function withSseKeepAlive(response: Response): Response {
  if (!response.body) return response;

  let keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  const stopKeepAlive = () => {
    if (keepAliveTimer) clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  };

  const keepAlive = new TransformStream<Uint8Array, Uint8Array>({
    start(controller) {
      keepAliveTimer = setInterval(() => {
        try {
          controller.enqueue(KEEP_ALIVE_COMMENT);
        } catch {
          stopKeepAlive();
        }
      }, KEEP_ALIVE_INTERVAL_MS);
    },
    flush: stopKeepAlive,
    cancel: stopKeepAlive,
  });

  return new Response(response.body.pipeThrough(keepAlive), response);
}
