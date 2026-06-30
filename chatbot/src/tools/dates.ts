import { tool } from 'ai';
import { z } from 'zod';
import type { RequestContext } from '../context.js';
import { groundingNow, nowInTimezone } from '../dates.js';
import type { KindedToolSet } from './types.js';

export function buildDateTools(ctx: RequestContext): KindedToolSet {
  return {
    getCurrentDateTime: {
      kind: 'READ',
      tool: tool({
        description:
          'Returns the current date and time in the user\'s timezone. Use this to resolve relative dates like "yesterday", "last Friday" or "this month".',
        inputSchema: z.object({}),
        execute: async () => ({
          now: nowInTimezone(ctx.timezone),
          timezone: ctx.timezone,
          display: groundingNow(ctx.timezone),
        }),
      }),
    },
  };
}
