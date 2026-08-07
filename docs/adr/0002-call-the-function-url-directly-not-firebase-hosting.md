# Call the function URL directly, bypassing Firebase Hosting rewrites

Firebase Hosting rewrites to functions pass through a CDN that buffers responses, which collapses an SSE stream into a single delivery at the end — defeating the entire point of [ADR-0001](./0001-sse-stream-from-a-single-http-function.md). The web app therefore calls the Cloud Run function URL directly, and Hosting serves only static assets.

**Do not "tidy this up" by adding a `/api/**` rewrite in `firebase.json`.** It looks like an obvious improvement and it will silently break live streaming — the runs will still work, the viewers will still appear, and the logs will simply all arrive at once when the Run finishes.

## Consequences

Every API call is cross-origin, which forces a chain of follow-on decisions: manual CORS with explicit `OPTIONS` preflight handling; no Firebase **callable** functions (they neither stream nor tolerate this shape); and no `EventSource` — it cannot send an `Authorization` header and is GET-only, so the client uses `fetch` + `ReadableStream` with a hand-rolled SSE parser. The function URL must be injected into the web build as an environment variable.
