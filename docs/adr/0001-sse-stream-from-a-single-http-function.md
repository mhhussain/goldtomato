# Stream each Run over SSE from a single HTTP function

A Run needs to hand the UI its `sessionViewerUrl` within a second or two, then keep working for minutes — so a plain request/response function is useless (the URL would only arrive once the Run was already over, with nothing left to watch). We stream instead: one `onRequest` gen2 function per Run, `Content-Type: text/event-stream`, emitting a `session` event immediately and `log` events as the Script executes.

## Considered Options

- **Two functions + Firestore + Cloud Tasks.** `startRun` returns the viewer URL and enqueues `executeRun`; the UI subscribes to the run document. Survives refreshes and gives free Run history. Rejected: roughly double the code and a queue to operate, in exchange for history we explicitly do not want.
- **Fire-and-forget background work after responding.** Rejected outright — Cloud Run throttles CPU once the response is sent, so post-response work is unreliable.
- **A dedicated Cloud Run service for the runner.** More headroom, but more infrastructure than a prototype justifies.

## Consequences

Runs do not survive a page refresh, and there is no Run history. Both are accepted. If either becomes a requirement, the Firestore option is the upgrade path — and because the Run Event union is the contract rather than the transport, the React grid should survive that swap unchanged.
