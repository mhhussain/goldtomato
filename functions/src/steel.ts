import Steel from 'steel-sdk';
import { chromium, type Browser, type Page } from 'playwright-core';
import { SESSION_TIMEOUT_MS } from './config';

export interface SteelSession {
  id: string;
  websocketUrl: string;
  sessionViewerUrl: string;
}

export function createClient(apiKey: string): Steel {
  return new Steel({ steelAPIKey: apiKey });
}

export async function createSession(steel: Steel): Promise<SteelSession> {
  // The Steel timeout is the only trustworthy leak guarantee (ADR-0006).
  const session = await steel.sessions.create({ timeout: SESSION_TIMEOUT_MS });
  return {
    id: session.id,
    websocketUrl: session.websocketUrl,
    sessionViewerUrl: session.sessionViewerUrl,
  };
}

export async function connect(
  session: SteelSession,
  apiKey: string,
): Promise<{ browser: Browser; page: Page }> {
  const browser = await chromium.connectOverCDP(`${session.websocketUrl}&apiKey=${apiKey}`);
  // Use the session's EXISTING context and page — a fresh context runs fine
  // but the Viewer shows a blank browser (see CLAUDE.md).
  const context = browser.contexts()[0];
  if (!context) throw new Error('Steel session has no browser context');
  const page = context.pages()[0] ?? (await context.newPage());
  return { browser, page };
}

export async function release(steel: Steel, sessionId: string): Promise<void> {
  try {
    await steel.sessions.release(sessionId);
  } catch {
    // Best effort — the session timeout reaps it regardless (ADR-0006).
  }
}
