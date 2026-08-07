# goldtomato

Paste Playwright code, press run, watch it execute N times in parallel in a grid of live cloud browsers (Steel.dev). Internal X by 2 demo instrument for the AO TSS engagement.

Read `CONTEXT.md` for the glossary, `docs/adr/` for locked decisions, `HANDOFF.md` for design background, and `CLAUDE.md` for working conventions.

## Structure

| Workspace | What |
|---|---|
| `packages/protocol` | The wire contract (`RunRequest`, `RunEvent`) shared by both ends |
| `functions` | `runScript` — one gen2 HTTP function per Run, streaming SSE |
| `apps/web` | Vite + React 19 app: editors, client-side fan-out, live grid |

## Getting started

```sh
npm install
npm run typecheck
npm run dev          # web app on http://localhost:5173
```

Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in the Firebase web config and the deployed function URL.

## Deploying

Prerequisites (one-time, see HANDOFF.md §7): Firebase project on Blaze plan with Hosting + gen2 Functions and Auth (Email/Password + Microsoft) enabled; Steel.dev API key in Secret Manager as `STEEL_API_KEY`; Azure AD app registration for the Microsoft provider. Update `.firebaserc` with the real project id.

```sh
firebase deploy --only functions      # note the printed function URL → VITE_RUN_FN_URL
npm run build
firebase deploy --only hosting
```

## Implementation plan

Each phase ends with something demonstrable; don't run them out of order.

- **Phase 0 — Scaffold** *(this repo)*: monorepo, protocol package, function + web app code complete. Exit: deploy both; web reaches the function URL cross-origin.
- **Phase 1 — One Run end-to-end, no auth**: temporarily bypass the domain gate, run a hardcoded Script. Exit: Viewer iframe shows live activity; log events arrive **incrementally** (if they burst at the end, streaming is buffered — stop and fix); Session released on completion; killing the tab releases (or times out) the Session. Also verify here: the Viewer URL is iframe-embeddable at all.
- **Phase 2 — Auth**: sign-in UI live against a real Firebase project; `@xby2.com` runs, everything else gets a clean 403; CORS preflight passes with `Authorization`.
- **Phase 3 — Batches**: the 10-Run smoke test — 10 live Viewers simultaneously (proves HTTP/2 lifts the 6-connection cap, ADR-0003), then raise `MAX_CONCURRENT_RUNS`; stop-all releases every Session.
- **Phase 4 — Polish**: status chips, error surfacing, editor ergonomics, more example Scripts.
- **Later**: real `.spec.ts` support (ADR-0004) as its own project.

### Unverified assumptions to check early

1. Steel plan concurrent-session cap (sets the real Fan-out Cap).
2. Viewer iframe embedding isn't blocked by `X-Frame-Options` / `frame-ancestors` — five-minute check in Phase 1.
3. Cloud Run response streaming isn't buffered (Phase 1 exit criterion).
4. HTTP/2 lifts the browser's 6-connection cap (Phase 3 smoke test).
5. Steel Node SDK surface (`websocketUrl`, `sessionViewerUrl`, `sessions.release`) matches the pinned version.
6. 10 concurrent Viewer iframes are viable on demo hardware.
