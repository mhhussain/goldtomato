# Scripts are bare async function bodies, not Playwright spec files

A Script is the *body* of an async function — `await page.goto(params.url)` — evaluated via `new AsyncFunction('page', 'params', 'log', src)` with those three bindings in scope. It is deliberately **not** real Playwright Test syntax: no `import`, no `test()`, no `expect`.

## Considered Options

- **Real `.spec.ts` files run by the Playwright Test runner**, with a `connectOverCDP` fixture pointing at Steel and a JSON reporter piped into the stream. This is the more credible artefact — a QA engineer could paste an existing AO spec and watch it run in the cloud. Rejected *for now* on cost: a spawned subprocess per Run, a temp file and generated config in `/tmp`, and reporter parsing in place of a simple `log` binding.

## Consequences

The first audience is X by 2 leadership, where the novel thing on show is parallel fan-out, not syntax compatibility. If the audience shifts to AO QA practitioners, expect "can I paste my own spec?" within minutes — and treat spec-file support as the headline of the next phase rather than a patch.

To keep that door open, the Run Event union is the contract and the execution strategy is an implementation detail behind it: bare bodies synthesise events from the `log` binding, a spec runner would synthesise the same events from reporter output, and the React grid distinguishes neither.
