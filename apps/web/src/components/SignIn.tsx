import { useState } from 'react';
import { signInEmail, signInMicrosoft } from '../lib/firebase';

export function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const attempt = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(undefined);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="w-80 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="mb-4 text-lg font-semibold text-zinc-100">
          gold<span className="text-red-500">tomato</span>
        </h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void attempt(() => signInEmail(email, password));
          }}
          className="flex flex-col gap-2"
        >
          <input
            type="email"
            required
            placeholder="you@xby2.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
          >
            Sign in
          </button>
        </form>
        <button
          onClick={() => void attempt(signInMicrosoft)}
          disabled={busy}
          className="mt-2 w-full rounded border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
        >
          Sign in with Microsoft
        </button>
        {error && <div className="mt-3 text-xs text-red-400">{error}</div>}
      </div>
    </div>
  );
}
