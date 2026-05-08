import * as Sentry from "@sentry/nextjs";

// Sentry client init is deferred 1s after module load. Cold-start
// budget is dominated by JS parse + first-paint work, and Sentry's
// init runs synchronous setup (transport construction, breadcrumb
// instrumentation, fetch wrapping) that adds ~50-150ms to TTI on
// the iOS WKWebView. Pushing the heavy work past first paint keeps
// the felt-time stopwatch number honest.
//
// Tradeoff: errors thrown in the first 1000ms aren't reported to
// Sentry. Acceptable per project decision (2026-05-08): cold-start
// errors that early are typically environment failures we can't
// action on anyway, and the bundle still ships @sentry/nextjs so
// later errors are captured normally.
//
// `if (typeof window !== 'undefined')` guards against the import
// being pulled into a Node context — Next runs the *.client.config
// modules only in client bundles, but the guard is cheap insurance
// if a future @sentry/nextjs upgrade widens that scope.
if (typeof window !== 'undefined') {
  setTimeout(() => {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      enabled: process.env.NODE_ENV === 'production',
    });
  }, 1000);
}
