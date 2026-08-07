import type { Page } from 'playwright-core';

export type LogFn = (level: 'info' | 'warn' | 'error', message: string) => void;

// AsyncFunction isn't a global; reach it via the prototype chain.
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
  ...args: string[]
) => (page: Page, params: Record<string, unknown>, log: (...a: unknown[]) => void) => Promise<unknown>;

/**
 * Evaluates a Script (bare async function body, ADR-0004) with `page`,
 * `params`, and `log` in scope. Not sandboxed — see ADR-0005.
 */
export async function executeScript(
  script: string,
  page: Page,
  params: Record<string, unknown>,
  log: LogFn,
): Promise<void> {
  const fn = new AsyncFunction('page', 'params', 'log', script);
  const userLog = (...args: unknown[]) =>
    log('info', args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
  await fn(page, params, userLog);
}
