# Goldtomato — Implementation Handoff

**Status:** design settled, nothing built. This document is the output of a design grilling session; the next session starts from here.

**Read first:** [`CONTEXT.md`](./CONTEXT.md) for the glossary (Script, Params, Run, Batch, Session, Viewer, Run Event, Fan-out Cap — these terms are used precisely throughout) and [`docs/adr/`](./docs/adr/) for the six decisions that are already locked and the reasoning behind each.

---

## 1. What this is

A web app where you paste Playwright code, press run, and watch it execute — N times in parallel — in a grid of live cloud browsers.

Internal X by 2 prototype supporting the AO TSS engagement. The purpose is to make cloud-scale browser automation *visible* and generate interest in Playwright tooling. It is a demo instrument, not a product. Design accordingly: the parallel fan-out and the live grid are the pitch, so anything that makes those slower or less impressive is the wrong trade.

## 2. How it works

```
┌─────────────────────────────────────────────┐
│  React app (Firebase Hosting, static)       │
│                                             │
│  Script editor  ·  Params editor  ·  Run    │
│                                             │
│  For each Run in the Batch:                 │
│    POST → fetch() → ReadableStream          │
│    ↓                                        │
│  Grid of N tiles, each an <iframe> of the   │
│  Session's sessionViewerUrl + a log pane    │
└───────────────┬─────────────────────────────┘
                │  N independent requests (client-side fan-out, ADR-0003)
                │  Authorization: Bearer <Firebase ID token>
                │  → Cloud Run function URL DIRECTLY, never via Hosting (ADR-0002)
                ▼
┌─────────────────────────────────────────────┐
│  runScript — one gen2 onRequest fn per Run  │
│                                             │
│  1. OPTIONS preflight / CORS                │
│  2. verifyIdToken, gate on @xby2.com        │
│  3. steel.sessions.create({ timeout })      │
│  4. emit `session` { sessionViewerUrl }  ◀── the UI can render the Viewer NOW
│  5. chromium.connectOverCDP(websocketUrl)   │
│  6. run the Script, emit `log` as it goes   │
│  7. emit `done` | `error`                   │
│  8. finally: close browser, release Session │
└───────────────┬─────────────────────────────┘
                ▼
        Steel.dev cloud browser
```

The critical sequencing: step 4 happens seconds in, step 6 takes minutes. That gap is the entire reason for streaming (ADR-0001).

## 3. Locked decisions

| Decision | ADR |
|---|---|
| SSE stream per Run from a single `onRequest` function; no Firestore, no Run history | [0001](./docs/adr/0001-sse-stream-from-a-single-http-function.md) |
| Call the function URL directly — Hosting rewrites buffer and break streaming | [0002](./docs/adr/0002-call-the-function-url-directly-not-firebase-hosting.md) |
| Batches fan out on the client; the API only knows about one Run | [0003](./docs/adr/0003-fan-out-on-the-client.md) |
| Scripts are bare async function bodies, not `.spec.ts` files | [0004](./docs/adr/0004-scripts-are-bare-async-function-bodies.md) |
| User Scripts are not sandboxed — valid only under stated conditions | [0005](./docs/adr/0005-user-scripts-are-not-sandboxed.md) |
| The Steel session timeout is the only trustworthy leak guarantee | [0006](./docs/adr/0006-steel-session-timeout-is-the-only-real-leak-guarantee.md) |

Also settled, but too minor for an ADR:

- **Auth:** Firebase Auth, email/password **and** Microsoft OIDC (`OAuthProvider('microsoft.com')`), both from day one. Access gate is domain-based (`@xby2.com`), not an allowlist — an allowlist adds friction at exactly the moment you're trying to impress someone.
- **Stack:** npm workspaces monorepo · Vite + React 19 + TypeScript strict · Tailwind · CodeMirror 6 for the editor (not Monaco — no IntelliSense needed for a bare body, and it's far lighter) · `firebase-functions` v2 + `firebase-admin` · `playwright-core` (**not** `playwright` — you connect over CDP and never need the ~300MB browser download) · Steel Node SDK.
- **Shared protocol package.** The Run Event union lives in `packages/protocol` and is imported by both ends, so a wire-format change fails to compile on both sides rather than at runtime in front of an audience.

## 4. Repo layout

```
goldtomato/
├── CONTEXT.md
├── HANDOFF.md
├── docs/adr/
├── package.json               # npm workspaces root
├── firebase.json              # hosting: static only — NO /api rewrite (ADR-0002)
├── .firebaserc
├── packages/protocol/
│   └── src/index.ts           # RunEvent union, RunRequest, config types
├── functions/
│   ├── src/
│   │   ├── index.ts           # runScript entrypoint
│   │   ├── auth.ts            # verifyIdToken + domain gate
│   │   ├── cors.ts            # manual preflight + headers
│   │   ├── sse.ts             # server-side event writer
│   │   ├── steel.ts           # session create / connect / release
│   │   └── execute.ts         # AsyncFunction evaluation of the Script
│   └── package.json
└── apps/web/
    ├── src/
    │   ├── lib/sse.ts         # fetch + ReadableStream SSE parser
    │   ├── lib/runBatch.ts    # client-side fan-out + cap + abort
    │   ├── lib/firebase.ts
    │   ├── components/ScriptEditor.tsx
    │   ├── components/ParamsEditor.tsx
    │   ├── components/RunGrid.tsx
    │   └── components/RunTile.tsx    # iframe Viewer + log pane + stop
    └── package.json
```

## 5. Wire protocol

`packages/protocol/src/index.ts` — the contract. Both ends import it; nothing else defines these shapes.

```ts
export interface RunRequest {
  script: string;              // bare async function body
  params: Record<string, unknown>;  // may be {}
}

export type RunEvent =
  | { type: 'status';  phase: 'creating' | 'connecting' | 'running'; ts: number }
  | { type: 'session'; sessionId: string; sessionViewerUrl: string; ts: number }
  | { type: 'log';     level: 'info' | 'warn' | 'error'; message: string; ts: number }
  | { type: 'error';   message: string; stack?: string; ts: number }
  | { type: 'done';    status: 'ok' | 'failed' | 'aborted'; durationMs: number; ts: number };
```

Note there is no `runId` on the wire. With client-side fan-out each Run *is* its own stream, so the client already knows which Run an event belongs to. Adding an id would be redundant — and if you ever move to server-side fan-out, that's the moment to add one.

`done` is always the last event, including after `error`. The client should treat stream-close-without-`done` as an abnormal termination and mark the tile accordingly.

## 6. Config constants

Keep these together in one module per side — they're the knobs you'll turn during a demo.

| Constant | Initial | Notes |
|---|---|---|
| `MAX_CONCURRENT_RUNS` | **6** | The Fan-out Cap. Stays at 6 until the 10-stream smoke test passes (ADR-0003), then raise to whatever your Steel plan allows. |
| `SESSION_TIMEOUT_MS` | `5 * 60_000` | Passed to `sessions.create`. Must stay well below `FN_TIMEOUT_SECONDS` so Steel reaps before the platform does (ADR-0006). |
| `FN_TIMEOUT_SECONDS` | `900` | gen2 max is 3600. |
| `FN_MEMORY` | `1GiB` | CDP clients are IO-bound; the remote browser does the real work. |
| `FN_MIN_INSTANCES` | `0` → `1` | **Set to 1 before any live demo.** A cold start in front of an audience is the worst possible first impression. Set it back afterwards — a warm instance bills continuously. |
| `ALLOWED_EMAIL_DOMAINS` | `['xby2.com']` | Widening this invalidates ADR-0005. Read it first. |

## 7. Prerequisites

Do these before writing code — several have external lead time.

- [ ] Firebase project created; Hosting + Functions (gen2) enabled; **Blaze plan** (gen2 requires it).
- [ ] Steel.dev account + API key. **Confirm the plan's concurrent-session cap** — this is the hard ceiling on the Fan-out Cap and the single biggest open unknown. If it's below ~10, either upgrade or self-host `steel-browser` (Docker/Railway).
- [ ] `STEEL_API_KEY` in Secret Manager, wired via `defineSecret`. Never in the web bundle.
- [ ] Azure AD app registration for Microsoft OIDC (you confirmed you have access), and the resulting client id/secret added to the Firebase Auth Microsoft provider.
- [ ] Firebase Auth: enable Email/Password and Microsoft providers.
- [ ] The deployed function URL exposed to the web build as a Vite env var (`VITE_RUN_FN_URL`).

## 8. Implementation phases

Each phase ends with something demonstrable. Don't run them out of order — Phase 1 de-risks the two assumptions everything else rests on.

### Phase 0 — Scaffold
Monorepo, workspaces, TypeScript strict, Firebase init, `packages/protocol` with the union above, deploy a hello-world function and a blank Vite app. Exit: both deployed, web can reach the function URL cross-origin.

### Phase 1 — One Run, end to end, no auth
The highest-risk phase. A hardcoded Script, one Session, streaming to a bare page with one iframe.

Exit criteria — all four must hold:
1. The Viewer iframe renders and shows live browser activity.
2. Log events arrive **incrementally** during the Run, not in a burst at the end. If they burst, streaming is being buffered somewhere — stop and fix it before building anything on top.
3. The Session is released on normal completion.
4. Killing the tab mid-Run releases the Session (or the timeout reaps it).

### Phase 2 — Auth
Firebase Auth UI (email/password + Microsoft), ID token attached to the request, `verifyIdToken` + domain gate in the function, CORS preflight passing with the `Authorization` header. Exit: an `@xby2.com` account can run; anything else gets a clean 403.

### Phase 3 — Batches
Params editor, Fan-out Cap enforcement, the grid, per-Run stop, stop-all.

Exit criteria:
1. A 10-Run Batch shows 10 live Viewers simultaneously — **this is the ADR-0003 smoke test.** If streams stall past the sixth, HTTP/2 isn't holding and server-side fan-out is the fallback.
2. Stop-all releases every Session.

### Phase 4 — Polish
Per-tile status chips, error surfacing, editor ergonomics, a couple of saved example Scripts to open a demo with (a demo with an empty editor is a demo that starts with typing).

### Later — real spec files
Playwright Test runner support per ADR-0004. Scope it as its own project, not a patch.

## 9. The tricky bits

Sketches, not finished code — these are the parts where the obvious approach is wrong.

**Evaluating the Script.** `AsyncFunction` isn't a global; reach it via the prototype chain.

```ts
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const fn = new AsyncFunction('page', 'params', 'log', script);
await fn(page, params, log);
```

**Connecting to Steel.** Use the session's **existing** context and page. Creating a fresh context is the classic mistake — the Run works fine but the Viewer shows a blank browser, because you're driving a context the viewer isn't watching.

```ts
const session = await steel.sessions.create({ timeout: SESSION_TIMEOUT_MS });
// emit the `session` event here — before connecting, so the Viewer mounts ASAP
const browser = await chromium.connectOverCDP(
  `${session.websocketUrl}&apiKey=${STEEL_API_KEY.value()}`
);
const context = browser.contexts()[0];
const page = context.pages()[0] ?? (await context.newPage());
```

**Streaming from the function.** Write, never `res.json`. Flush headers before the first event so the client's `getReader()` resolves immediately rather than waiting for the first chunk.

```ts
res.set({
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no',
});
res.flushHeaders();
const send = (e: RunEvent) => res.write(`data: ${JSON.stringify(e)}\n\n`);
```

**Aborting.** `req.on('close')` fires on tab close, refresh, and client `AbortController`. Playwright calls don't take an `AbortSignal`, so check the flag between steps — you cannot interrupt an in-flight `page.goto`, and shouldn't pretend otherwise (ADR-0006).

**Client-side parsing.** `EventSource` is unusable here: GET-only, and it can't send `Authorization`. Hand-roll it.

```ts
const res = await fetch(RUN_FN_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
  body: JSON.stringify({ script, params } satisfies RunRequest),
  signal: abortController.signal,
});
const reader = res.body!.getReader();
const decoder = new TextDecoder();
let buf = '';
for (;;) {
  const { done, value } = await reader.read();
  if (done) break;
  buf += decoder.decode(value, { stream: true });
  const frames = buf.split('\n\n');
  buf = frames.pop() ?? '';              // keep the trailing partial frame
  for (const f of frames) {
    if (f.startsWith('data: ')) onEvent(JSON.parse(f.slice(6)) as RunEvent);
  }
}
```

**CORS.** Handle `OPTIONS` yourself and return before any auth work. Allow the Hosting origin and `http://localhost:5173`, and allow the `Authorization` header explicitly or the preflight fails. Don't reach for the `cors` package — you want direct control over the preflight response alongside a streaming body.

## 10. Unverified assumptions

Each of these could cost a day. Check them early — most can be settled in minutes.

1. **Steel plan concurrency cap.** Ceiling on the whole premise. Verify before Phase 3, ideally before Phase 0.
2. **Steel Viewer iframe embedding.** If `sessionViewerUrl` sends `X-Frame-Options: DENY` or a restrictive `frame-ancestors`, the grid can't render and you need Steel's embed-specific URL or an alternative. **Test this in Phase 1** — it's a five-minute check that invalidates the entire UI concept if it fails.
3. **Cloud Run response streaming isn't buffered.** Expected to work; Phase 1 exit criterion 2 proves it.
4. **HTTP/2 lifts the 6-connection cap.** Phase 3 exit criterion 1 proves it. Fallback: server-side fan-out (ADR-0003).
5. **Steel Node SDK package name and API surface.** `session.websocketUrl`, `session.sessionViewerUrl`, and `sessions.release()` are per Steel's docs and confirmed by their Playwright guide, but pin the version and check the current reference rather than trusting this document.
6. **10 concurrent Viewer iframes** may be heavy on bandwidth and client CPU. If the grid stutters, consider streaming only the focused tile at full fidelity.

## 11. Out of scope

Stated explicitly so nobody helpfully adds them: Run history and persistence · assertions and pass/fail reporting · scheduling and CI integration · multi-tenancy · Script sharing or saved libraries · any sandboxing of user code (ADR-0005) · self-hosted Steel (fallback only).

## 12. Open questions

- **Params editor shape.** A single JSON array of objects in one textarea is the fastest to build and the most flexible. A table/grid is nicer to demo but more work. Unresolved — pick in Phase 3.
- **Steel plan concurrency cap.** Unknown, and it sets the real Fan-out Cap.
- **First demo audience.** Assumed X by 2 leadership, which is what justifies ADR-0004. If it's AO QA practitioners instead, revisit that ADR before Phase 1 — the bare-body contract is the thing they'll push back on.

## References

- [Steel: automate a cloud browser with Playwright](https://docs.steel.dev/overview/guides/playwright-node)
- [Steel Node SDK](https://steel.dev/blog/steel-node-sdk)
- [Steel self-hosting on Railway](https://docs.steel.dev/overview/self-hosting/railway) — the fallback if plan concurrency is too low
