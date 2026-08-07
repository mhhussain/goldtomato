# User Scripts are not sandboxed

A Script is arbitrary JavaScript executed in the function's own Node process, with the process's full ambient authority — including `process.env`, and therefore the Steel API key. There is no `isolated-vm`, no worker, no separate container.

This is a deliberate, informed trade, valid **only** under the conditions below. It is not an oversight, and it is not a TODO.

## Why this is acceptable here

Access is restricted to authenticated `@xby2.com` accounts, so every caller is a colleague who could be asked directly. The tool is a prototype and internal demo, never a public playground. The blast radius is one prototype's Firebase project and one Steel account — no production data, no customer systems.

## What invalidates it

Any of the following turns this from a reasonable trade into a genuine vulnerability, and each one requires revisiting this ADR before proceeding:

- Opening access beyond the `@xby2.com` domain gate — in particular handing it to AO users, which is a plausible next step for a demo tool.
- Removing authentication for any reason, including "just for a demo".
- Adding a secret worth stealing to the function's environment, or granting its service account any meaningful IAM role.
- Pointing it at anything real: production credentials, internal networks, customer data.

## Consequences

Keep the function's service account minimally privileged and its environment free of anything beyond the Steel key. When the sandbox is eventually needed, the execution strategy is already isolated behind the Run Event contract (see [ADR-0004](./0004-scripts-are-bare-async-function-bodies.md)), so swapping in `isolated-vm` or a per-Run container is a contained change.
