import { tool } from 'ai';
import { z } from 'zod';
import type { KindedToolSet } from '@/tools/types.js';

export function evaluateMath(expr: string): number {
  const tokens = expr.match(/\d+(\.\d+)?|[+\-*/()]/g) || [];
  let position = 0;

  function peek(): string | undefined {
    return tokens[position];
  }

  function consume(expected?: string): string {
    const token = tokens[position];
    if (expected !== undefined && token !== expected) {
      throw new Error(`Expected ${expected} but got ${token}`);
    }
    position++;
    return token;
  }

  function parsePrimary(): number {
    const token = peek();
    if (token === '(') {
      consume('(');
      const val = parseExpression();
      consume(')');
      return val;
    }
    if (token === '-') {
      consume('-');
      return -parsePrimary();
    }
    if (token && /^\d+(\.\d+)?$/.test(token)) {
      return parseFloat(consume());
    }
    throw new Error(`Unexpected token: ${token}`);
  }

  function parseMultiplicative(): number {
    let val = parsePrimary();
    while (true) {
      const token = peek();
      if (token === '*') {
        consume('*');
        val *= parsePrimary();
      } else if (token === '/') {
        consume('/');
        const divisor = parsePrimary();
        if (divisor === 0) {
          throw new Error('Division by zero');
        }
        val /= divisor;
      } else {
        break;
      }
    }
    return val;
  }

  function parseExpression(): number {
    let val = parseMultiplicative();
    while (true) {
      const token = peek();
      if (token === '+') {
        consume('+');
        val += parseMultiplicative();
      } else if (token === '-') {
        consume('-');
        val -= parseMultiplicative();
      } else {
        break;
      }
    }
    return val;
  }

  const result = parseExpression();
  if (position < tokens.length) {
    throw new Error(`Unexpected trailing tokens starting at: ${tokens[position]}`);
  }
  return result;
}

export function buildCalculatorTools(): KindedToolSet {
  return {
    calculate: {
      kind: 'READ',
      ui: { invalidates: [], label: { en: 'Performing calculations...', es: 'Realizando cálculos matemáticos...' } },
      tool: tool({
        description:
          'Evaluate a mathematical expression. Supports basic arithmetic operators (+, -, *, /) and parentheses (). Use this tool ALWAYS for any calculation, budget sum, split, or operation to prevent hallucination of numerical values.',
        inputSchema: z.object({
          expression: z.string().describe('The mathematical expression to evaluate, e.g. "(120 + 35) * 1.1"'),
        }),
        execute: async ({ expression }) => {
          try {
            // Clean expression: remove spaces
            const sanitized = expression.replace(/\s+/g, '');
            if (!/^[0-9+\-*/().]+$/.test(sanitized)) {
              return { error: 'Invalid expression. Only digits, +, -, *, /, (, and ) are allowed.' };
            }
            const result = evaluateMath(sanitized);
            return { result };
          } catch (e) {
            return { error: (e as Error).message };
          }
        },
      }),
    },
  };
}
