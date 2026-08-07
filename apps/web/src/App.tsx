import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, signOut, type User } from './lib/firebase';
import { runBatch, initialRunState, type RunState, type BatchHandle } from './lib/runBatch';
import { MAX_CONCURRENT_RUNS } from './config';
import { EXAMPLES } from './examples';
import { SignIn } from './components/SignIn';
import { ScriptEditor } from './components/ScriptEditor';
import { ParamsEditor, parseParamsList } from './components/ParamsEditor';
import { RunGrid } from './components/RunGrid';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (u) => {
    setUser(u);
    setAuthReady(true);
  }), []);

  if (!authReady) return null;
  if (!user) return <SignIn />;
  return <Workbench user={user} />;
}

function Workbench({ user }: { user: User }) {
  const [script, setScript] = useState(EXAMPLES[0]!.script);
  const [paramsText, setParamsText] = useState(EXAMPLES[0]!.params);
  const [paramsError, setParamsError] = useState<string>();
  const [runs, setRuns] = useState<RunState[]>([]);
  const batchRef = useRef<BatchHandle | null>(null);

  const batchActive = runs.some(
    (r) => r.phase === 'pending' || r.phase === 'creating' || r.phase === 'connecting' || r.phase === 'running',
  );

  const launch = () => {
    let paramsList: Array<Record<string, unknown>>;
    try {
      paramsList = parseParamsList(paramsText);
    } catch (e) {
      setParamsError(e instanceof Error ? e.message : String(e));
      return;
    }
    if (paramsList.length > MAX_CONCURRENT_RUNS) {
      setParamsError(`Fan-out Cap is ${MAX_CONCURRENT_RUNS} Runs per Batch (${paramsList.length} given)`);
      return;
    }
    setParamsError(undefined);
    setRuns(paramsList.map((_, i) => initialRunState(i)));
    batchRef.current = runBatch(script, paramsList, user, (index, update) => {
      setRuns((prev) => prev.map((r) => (r.index === index ? update(r) : r)));
    });
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      {/* Left: editors */}
      <div className="flex w-[28rem] shrink-0 flex-col gap-3 border-r border-zinc-800 p-4">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold">
            gold<span className="text-red-500">tomato</span>
          </h1>
          <div className="flex-1" />
          <span className="max-w-40 truncate text-xs text-zinc-500">{user.email}</span>
          <button onClick={() => void signOut()} className="text-xs text-zinc-400 hover:text-zinc-200">
            Sign out
          </button>
        </div>

        <select
          className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200"
          value=""
          onChange={(e) => {
            const ex = EXAMPLES.find((x) => x.name === e.target.value);
            if (ex) {
              setScript(ex.script);
              setParamsText(ex.params);
            }
          }}
        >
          <option value="" disabled>
            Load an example…
          </option>
          {EXAMPLES.map((ex) => (
            <option key={ex.name} value={ex.name}>
              {ex.name}
            </option>
          ))}
        </select>

        <ScriptEditor value={script} onChange={setScript} />
        <ParamsEditor value={paramsText} onChange={setParamsText} error={paramsError} />

        <div className="flex gap-2">
          <button
            onClick={launch}
            disabled={batchActive}
            className="flex-1 rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
          >
            Run
          </button>
          {batchActive && (
            <button
              onClick={() => batchRef.current?.abortAll()}
              className="rounded border border-red-700 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-950"
            >
              Stop all
            </button>
          )}
        </div>
      </div>

      {/* Right: the grid */}
      <div className="min-w-0 flex-1 overflow-y-auto p-4">
        <RunGrid runs={runs} onStopRun={(i) => batchRef.current?.abortRun(i)} />
      </div>
    </div>
  );
}
