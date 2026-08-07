# Fan out Batches on the client

A Batch of N Runs is created by the browser opening N independent requests, one per Run. The API only ever knows about a single Run; `Batch` exists nowhere in the backend.

## Considered Options

- **Server-side fan-out** — one request carrying `params[]`, one function instance driving N CDP clients and multiplexing all their events onto one stream. This was the original recommendation, because concurrent SSE streams are capped at 6 per origin under HTTP/1.1 and a 10-run Batch would sit right on that line. Rejected in favour of the simpler per-Run function, which keeps failures isolated and lets Cloud Run autoscale naturally.

## Consequences

The HTTP/1.1 connection cap is a live risk. Google Frontend serves HTTP/2 over HTTPS, which raises the ceiling to ~100 concurrent streams, so this is expected to hold — **but it is unverified, and a 10-concurrent-Run smoke test is a Phase 3 exit criterion.** Until it passes, the Fan-out Cap stays at 6. If HTTP/2 turns out not to hold end-to-end, server-side fan-out is the fallback.
