// Every server-side knob you'd turn during a demo, in one place (see CLAUDE.md).

/** Passed to steel.sessions.create. Must stay well below FN_TIMEOUT_SECONDS so
 *  Steel reaps the Session before the platform kills the function (ADR-0006). */
export const SESSION_TIMEOUT_MS = 5 * 60_000;

/** gen2 max is 3600. */
export const FN_TIMEOUT_SECONDS = 900;

/** CDP clients are IO-bound; the remote browser does the real work. */
export const FN_MEMORY = '1GiB' as const;

/** Set to 1 before any live demo; set back to 0 afterwards. */
export const FN_MIN_INSTANCES = 0;

/** Widening this invalidates ADR-0005 — read it first. */
export const ALLOWED_EMAIL_DOMAINS = ['xby2.com'];

/** Origins allowed to call runScript. */
export const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://goldtomato.web.app',
  'https://goldtomato.firebaseapp.com',
];
