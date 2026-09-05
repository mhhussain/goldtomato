// Every client-side knob you'd turn during a demo, in one place (see CLAUDE.md).

/** The Fan-out Cap. Stays at 6 until the 10-stream smoke test passes (ADR-0003). */
export const MAX_CONCURRENT_RUNS = 6;

/** Deployed runScript URL — the function is called directly (ADR-0002). */
export const RUN_FN_URL = import.meta.env.VITE_RUN_FN_URL as string;
