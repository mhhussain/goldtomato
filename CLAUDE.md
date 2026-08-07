# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

Goldtomato: paste Playwright code in a web editor, run it N times in parallel against Steel.dev cloud browsers, watch every run live in a grid. An internal X by 2 demo instrument, not a product — the parallel fan-out and the live grid are the pitch; anything that makes those slower or less impressive is the wrong trade.

**Read before changing anything:** `CONTEXT.md` (glossary — Script, Params, Run, Batch, Session, Viewer, Run Event, Fan-out Cap are used precisely everywhere, including in code) and `docs/adr/` (six locked decisions). `HANDOFF.md` is the original design handoff and implementation plan.

## Locked decisions — do not re-litigate without updating the ADR

1. **ADR-0001**: One SSE stream per Run from a single `onRequest` gen2 function. No Firestore, no run history.
2. **ADR-0002**: The web app calls the Cloud Run function URL **directly** (`VITE_RUN_FN_URL`). Never add an `/api` rewrite to `firebase.json` — Hosting buffers and breaks streaming.
3. **ADR-0003**: Batches fan out on the client. The API only ever knows about one Run. No `runId` on the wire.
4. **ADR-0004**: Scripts are bare async function bodies evaluated with `page`, `params`, `log` in scope — not `.spec.ts` files.
5. **ADR-0005**: User Scripts are **not sandboxed**. Valid only while access is gated to `@xby2.com`. Widening `ALLOWED_EMAIL_DOMAINS` invalidates this ADR — read it first.
6. **ADR-0006**: The Steel session `timeout` is the only trustworthy leak guarantee. `SESSION_TIMEOUT_MS` must stay well below `FN_TIMEOUT_SECONDS`.

## Repo layout

- `packages/protocol` — the wire contract (`RunEvent`, `RunRequest`, shared config). Both ends import it; **nothing else defines these shapes**.
- `functions` — the `runScript` gen2 HTTP function (auth, CORS, SSE writer, Steel session lifecycle, Script evaluation).
- `apps/web` — Vite + React 19 + TypeScript strict + Tailwind + CodeMirror 6.

npm workspaces monorepo. `npm install` at the root. Node 20+.

## Commands

- `npm run build` (root) — builds protocol → functions → web, in that order.
- `npm run typecheck` (root) — typechecks all workspaces.
- `npm run dev -w apps/web` — Vite dev server on `http://localhost:5173`.
- `npm run build -w functions` then `firebase deploy --only functions` — deploy the function.
- `firebase deploy --only hosting` — deploy the web app (build first).

## Conventions

- `playwright-core`, never `playwright` — we connect over CDP and must not pull the browser download.
- All tunable knobs live in one config module per side (`functions/src/config.ts`, `apps/web/src/config.ts`). Don't scatter constants.
- Secrets: `STEEL_API_KEY` via `defineSecret` / Secret Manager only. Never in the web bundle, never in the repo.
- CORS is handled manually in `functions/src/cors.ts` — do not introduce the `cors` package.
- SSE frames are `data: <json>\n\n`; `done` is always the last event, including after `error`. Stream-close-without-`done` means abnormal termination.
- When connecting to a Steel session, use the browser's **existing** context and page (`browser.contexts()[0]`) — a fresh context runs fine but the Viewer shows a blank browser.
- Use the glossary terms in identifiers and comments (Run, Batch, Session…), and avoid their listed synonyms.

## Workflow

- All changes land on `main` via pull request from a feature branch.
- Before a live demo: set `minInstances` to 1; set it back afterwards.
