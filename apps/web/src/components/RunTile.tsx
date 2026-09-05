import { useEffect, useRef } from 'react';
import type { RunState, RunPhase } from '../lib/runBatch';

const PHASE_STYLE: Record<RunPhase, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-zinc-600 text-zinc-100' },
  creating: { label: 'Creating session', className: 'bg-amber-600 text-white' },
  connecting: { label: 'Connecting', className: 'bg-amber-500 text-white' },
  running: { label: 'Running', className: 'bg-blue-600 text-white' },
  ok: { label: 'Done', className: 'bg-emerald-600 text-white' },
  failed: { label: 'Failed', className: 'bg-red-600 text-white' },
  aborted: { label: 'Aborted', className: 'bg-zinc-500 text-white' },
};

const LOG_COLOR = { info: 'text-zinc-300', warn: 'text-amber-400', error: 'text-red-400' } as const;

export function RunTile({ run, onStop }: { run: RunState; onStop: () => void }) {
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [run.logs.length]);

  const phase = PHASE_STYLE[run.phase];
  const active = run.phase === 'creating' || run.phase === 'connecting' || run.phase === 'running' || run.phase === 'pending';

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900">
      <div className="flex items-center gap-2 border-b border-zinc-700 px-2 py-1.5">
        <span className="text-xs font-semibold text-zinc-400">Run {run.index + 1}</span>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${phase.className}`}>{phase.label}</span>
        {run.durationMs !== undefined && (
          <span className="text-[10px] text-zinc-500">{(run.durationMs / 1000).toFixed(1)}s</span>
        )}
        <div className="flex-1" />
        {active && (
          <button
            onClick={onStop}
            className="rounded bg-red-700 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-red-600"
          >
            Stop
          </button>
        )}
      </div>

      <div className="aspect-video bg-black">
        {run.sessionViewerUrl ? (
          <iframe
            src={run.sessionViewerUrl}
            title={`Run ${run.index + 1} viewer`}
            className="h-full w-full border-0"
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-zinc-600">
            Waiting for Session…
          </div>
        )}
      </div>

      <div ref={logRef} className="h-24 overflow-y-auto bg-zinc-950 p-2 font-mono text-[11px] leading-4">
        {run.logs.map((l, i) => (
          <div key={i} className={LOG_COLOR[l.level]}>
            {l.message}
          </div>
        ))}
        {run.error && <div className="text-red-400">✖ {run.error}</div>}
      </div>
    </div>
  );
}
