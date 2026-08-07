# The Steel session timeout is the only real leak guarantee

Sessions are billed by the minute, so an orphaned browser is a bill. Three mechanisms release them, and only the third is trustworthy:

1. `finally { await browser.close(); await steel.sessions.release(id) }` — covers normal completion and thrown Scripts.
2. `req.on('close')` → `AbortController` → the same `finally` — covers a closed tab, a refresh, and the Stop buttons.
3. A `timeout` passed to `steel.sessions.create()` — Steel reaps the Session server-side no matter what this process does.

The first two are best-effort: they live inside a process that can be killed, throttled, or hung, and Playwright operations do not accept an `AbortSignal`, so an abort only takes effect *between* steps and cannot interrupt an in-flight `page.goto`. Only (3) survives the function dying.

## Consequences

`SESSION_TIMEOUT_MS` must always be set at create time and must stay comfortably below the function's own `timeoutSeconds`, so Steel wins the race rather than the platform. Treat (1) and (2) as cost optimisations that keep the common case tidy — never as the guarantee.
