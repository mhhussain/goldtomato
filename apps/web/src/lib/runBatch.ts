import type { RunEvent } from '@goldtomato/protocol';
import type { User } from './firebase';
import { streamRun } from './sse';

export type RunPhase = 'pending' | 'creating' | 'connecting' | 'running' | 'ok' | 'failed' | 'aborted';

export interface RunState {
  index: number;
  phase: RunPhase;
  sessionViewerUrl?: string;
  logs: Array<{ level: 'info' | 'warn' | 'error'; message: string; ts: number }>;
  error?: string;
  durationMs?: number;
}

export function initialRunState(index: number): RunState {
  return { index, phase: 'pending', logs: [] };
}

export function reduceRunState(state: RunState, event: RunEvent): RunState {
  switch (event.type) {
    case 'status':
      return { ...state, phase: event.phase };
    case 'session':
      return { ...state, sessionViewerUrl: event.sessionViewerUrl };
    case 'log':
      return { ...state, logs: [...state.logs, { level: event.level, message: event.message, ts: event.ts }] };
    case 'error':
      return { ...state, error: event.message };
    case 'done':
      return { ...state, phase: event.status, durationMs: event.durationMs };
  }
}

export interface BatchHandle {
  abortRun(index: number): void;
  abortAll(): void;
}

/**
 * Client-side fan-out (ADR-0003): one independent request per Run, all
 * launched immediately — the Fan-out Cap is enforced by the UI before this
 * is called, and simultaneity is the demo.
 */
export function runBatch(
  script: string,
  paramsList: Array<Record<string, unknown>>,
  user: User,
  onUpdate: (index: number, update: (prev: RunState) => RunState) => void,
): BatchHandle {
  const controllers = paramsList.map(() => new AbortController());

  paramsList.forEach(async (params, index) => {
    const signal = controllers[index]!.signal;
    try {
      const idToken = await user.getIdToken();
      const { sawDone } = await streamRun({ script, params }, idToken, (event) => {
        onUpdate(index, (prev) => reduceRunState(prev, event));
      }, signal);
      if (!sawDone) {
        // Stream closed without `done` — abnormal termination.
        onUpdate(index, (prev) =>
          prev.phase === 'ok' || prev.phase === 'failed' || prev.phase === 'aborted'
            ? prev
            : { ...prev, phase: 'failed', error: prev.error ?? 'Stream closed unexpectedly' },
        );
      }
    } catch (e) {
      const aborted = signal.aborted;
      onUpdate(index, (prev) => ({
        ...prev,
        phase: aborted ? 'aborted' : 'failed',
        error: aborted ? prev.error : e instanceof Error ? e.message : String(e),
      }));
    }
  });

  return {
    abortRun: (index) => controllers[index]?.abort(),
    abortAll: () => controllers.forEach((c) => c.abort()),
  };
}
