const KEEP_ALIVE_INTERVAL_MS = 25_000;
const KEEP_ALIVE_COMMENT = new TextEncoder().encode(': keep-alive\n\n');
const LINE_FEED = 0x0a;

/**
 * Injects SSE comment lines into a streaming response while the model is silent.
 *
 * Proxies between the browser and this service (Cloudflare closes proxied
 * connections after ~100s without data) kill the chat stream during long tool
 * executions, so the reply never reaches the client. SSE comments are ignored
 * by every spec-compliant parser, so they keep the connection alive without
 * altering the UI message stream.
 *
 * Comments are only injected at event boundaries (after a blank line): an SSE
 * event may arrive split across chunks, and injecting mid-event would truncate
 * it and corrupt the stream.
 */
export function withSseKeepAlive(response: Response): Response {
  if (!response.body) return response;

  let atEventBoundary = true;
  let keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  const stopKeepAlive = () => {
    if (keepAliveTimer) clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  };

  const keepAlive = new TransformStream<Uint8Array, Uint8Array>({
    start(controller) {
      keepAliveTimer = setInterval(() => {
        if (!atEventBoundary) return;
        try {
          controller.enqueue(KEEP_ALIVE_COMMENT);
        } catch {
          stopKeepAlive();
        }
      }, KEEP_ALIVE_INTERVAL_MS);
    },
    transform(chunk, controller) {
      if (chunk.length === 1) {
        atEventBoundary = atEventBoundary && chunk[0] === LINE_FEED;
      } else if (chunk.length > 1) {
        atEventBoundary = chunk[chunk.length - 1] === LINE_FEED && chunk[chunk.length - 2] === LINE_FEED;
      }
      controller.enqueue(chunk);
    },
    flush: stopKeepAlive,
    cancel: stopKeepAlive,
  });

  return new Response(response.body.pipeThrough(keepAlive), response);
}
