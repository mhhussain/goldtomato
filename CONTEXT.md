# Goldtomato

A Playwright runner and in-browser viewer. A user pastes Playwright code into a web editor, runs it N times in parallel against cloud browsers hosted by Steel.dev, and watches every run stream live in a grid.

Built as an internal X by 2 prototype and demo tool for the AO TSS engagement — the goal is to make cloud-scale browser automation visible and tangible, not to ship a product.

## Language

**Script**:
The Playwright source the user types into the editor. A bare async function body — no imports, no wrapper — evaluated with `page`, `params`, and `log` already in scope.
_Avoid_: test, spec, code, snippet

**Params**:
A single JSON object injected into one Script execution, letting the same Script behave differently per run. May be empty.
_Avoid_: fixture, test data, arguments, variables

**Run**:
One execution of a Script against one Session with one Params object. The atomic unit of work — one HTTP request, one SSE stream, one tile in the grid.
_Avoid_: job, task, execution, invocation

**Batch**:
The set of Runs launched together by a single press of the run button — one Script, N Params objects. A client-side concept only; the API has no knowledge of it.
_Avoid_: suite, group, fleet, campaign

**Session**:
A Steel.dev cloud browser rented for the lifetime of one Run. Always 1:1 with a Run.
_Avoid_: browser, instance, container

**Viewer**:
Steel's live embeddable view of a Session, rendered in an iframe from `sessionViewerUrl`. What the user actually watches.
_Avoid_: stream, preview, screencast

**Run Event**:
One message on a Run's SSE stream. A discriminated union — `status`, `session`, `log`, `error`, `done` — defined once in `packages/protocol` and shared by both ends.
_Avoid_: message, update, packet

**Fan-out Cap**:
The configured maximum number of Runs in one Batch. Enforced in the UI, tuned by hand to whatever the current Steel plan's concurrent-session limit allows.
_Avoid_: limit, quota, max parallelism
