import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import type { RunRequest } from '@goldtomato/protocol';
import { FN_TIMEOUT_SECONDS, FN_MEMORY, FN_MIN_INSTANCES } from './config';
import { handleCors } from './cors';
import { requireUser, AuthError } from './auth';
import { createSseWriter } from './sse';
import { createClient, createSession, connect, release } from './steel';
import { executeScript } from './execute';

initializeApp();

const STEEL_API_KEY = defineSecret('STEEL_API_KEY');

// One gen2 onRequest function per Run; SSE stream back to the client (ADR-0001).
// Called directly at its Cloud Run URL, never via Hosting (ADR-0002).
export const runScript = onRequest(
  {
    timeoutSeconds: FN_TIMEOUT_SECONDS,
    memory: FN_MEMORY,
    minInstances: FN_MIN_INSTANCES,
    secrets: [STEEL_API_KEY],
  },
  async (req, res) => {
    if (handleCors(req, res)) return;

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'POST only' });
      return;
    }

    try {
      await requireUser(req);
    } catch (e) {
      const status = e instanceof AuthError ? e.status : 401;
      res.status(status).json({ error: e instanceof Error ? e.message : 'Unauthorized' });
      return;
    }

    const body = req.body as Partial<RunRequest> | undefined;
    if (!body || typeof body.script !== 'string' || body.script.trim() === '') {
      res.status(400).json({ error: 'Missing script' });
      return;
    }
    const script = body.script;
    const params = body.params && typeof body.params === 'object' ? body.params : {};

    const sse = createSseWriter(res);
    const startedAt = Date.now();

    // Fires on tab close, refresh, and client AbortController. Playwright calls
    // can't take an AbortSignal, so the flag is checked between steps.
    let aborted = false;
    req.on('close', () => {
      aborted = true;
    });

    const steel = createClient(STEEL_API_KEY.value());
    let sessionId: string | undefined;
    let browser: Awaited<ReturnType<typeof connect>>['browser'] | undefined;

    try {
      sse.send({ type: 'status', phase: 'creating' });
      const session = await createSession(steel);
      sessionId = session.id;

      // Emit before connecting so the Viewer mounts ASAP — this gap is the
      // entire reason for streaming (ADR-0001).
      sse.send({ type: 'session', sessionId: session.id, sessionViewerUrl: session.sessionViewerUrl });

      if (aborted) throw new AbortSignalled();

      sse.send({ type: 'status', phase: 'connecting' });
      const connected = await connect(session, STEEL_API_KEY.value());
      browser = connected.browser;

      if (aborted) throw new AbortSignalled();

      sse.send({ type: 'status', phase: 'running' });
      await executeScript(script, connected.page, params as Record<string, unknown>, (level, message) =>
        sse.send({ type: 'log', level, message }),
      );

      sse.send({
        type: 'done',
        status: aborted ? 'aborted' : 'ok',
        durationMs: Date.now() - startedAt,
      });
    } catch (e) {
      if (e instanceof AbortSignalled) {
        sse.send({ type: 'done', status: 'aborted', durationMs: Date.now() - startedAt });
      } else {
        const err = e instanceof Error ? e : new Error(String(e));
        sse.send({ type: 'error', message: err.message, stack: err.stack });
        sse.send({ type: 'done', status: 'failed', durationMs: Date.now() - startedAt });
      }
    } finally {
      try {
        await browser?.close();
      } catch {
        // Session release / timeout covers it (ADR-0006).
      }
      if (sessionId) await release(steel, sessionId);
      sse.end();
    }
  },
);

class AbortSignalled extends Error {
  constructor() {
    super('Run aborted by client');
  }
}
