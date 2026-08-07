import type { RunState } from '../lib/runBatch';
import { RunTile } from './RunTile';

export function RunGrid({ runs, onStopRun }: { runs: RunState[]; onStopRun: (index: number) => void }) {
  if (runs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-600">
        Press Run to launch a Batch.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {runs.map((run) => (
        <RunTile key={run.index} run={run} onStop={() => onStopRun(run.index)} />
      ))}
    </div>
  );
}
