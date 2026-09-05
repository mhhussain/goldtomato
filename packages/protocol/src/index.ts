// The wire contract between apps/web and functions. Nothing else defines these shapes.

export interface RunRequest {
  /** Bare async function body, evaluated with `page`, `params`, `log` in scope (ADR-0004). */
  script: string;
  /** One Params object for this Run. May be {}. */
  params: Record<string, unknown>;
}

export type RunEvent =
  | { type: 'status'; phase: 'creating' | 'connecting' | 'running'; ts: number }
  | { type: 'session'; sessionId: string; sessionViewerUrl: string; ts: number }
  | { type: 'log'; level: 'info' | 'warn' | 'error'; message: string; ts: number }
  | { type: 'error'; message: string; stack?: string; ts: number }
  | { type: 'done'; status: 'ok' | 'failed' | 'aborted'; durationMs: number; ts: number };

export type RunEventType = RunEvent['type'];
export type DoneStatus = Extract<RunEvent, { type: 'done' }>['status'];
