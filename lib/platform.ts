/**
 * Platform detection helpers for BetAutopsy's dual-target build
 * (web on Vercel vs. mobile via Capacitor static export).
 *
 * Two axes to keep straight:
 *
 *   1. **Build target** — set at build time via
 *      `NEXT_PUBLIC_BUILD_TARGET=mobile`. Inlined by Next into the
 *      client bundle, so `isMobileBuild()` is safe in Server
 *      Components, client components, route handlers, and Node
 *      scripts, and returns the same value everywhere.
 *
 *   2. **Runtime environment** — whether the currently-running
 *      bundle is actually inside a Capacitor native webview vs. a
 *      regular browser vs. an SSR/Node context. Only knowable at
 *      runtime on the client. `isMobileApp()` answers this.
 *
 * Why both: a mobile *build* is a necessary but not sufficient
 * condition for being inside the native app. During `npm run
 * build:mobile` the same bundle is also executed in a Node context
 * (prerender), where `window` is undefined — so any code that
 * conditionally calls Capacitor plugins must gate on
 * `isMobileApp()`, not `isMobileBuild()`.
 */

/**
 * True when this bundle was produced by `npm run build:mobile`
 * (i.e. `NEXT_PUBLIC_BUILD_TARGET === 'mobile'`). Constant for the
 * lifetime of the bundle. Safe on server and client.
 */
export function isMobileBuild(): boolean {
  return process.env.NEXT_PUBLIC_BUILD_TARGET === 'mobile';
}

/**
 * True when the current code is running inside a Capacitor native
 * webview. Returns false during SSR/prerender (no `window`) and
 * false in a regular browser. Requires a mobile build — a web
 * bundle will always return false even if Capacitor were somehow
 * injected, because we gate on the build flag first.
 */
export function isMobileApp(): boolean {
  if (!isMobileBuild()) return false;
  if (typeof window === 'undefined') return false;
  // Capacitor injects `window.Capacitor` into the webview. We check
  // for its existence rather than importing `@capacitor/core` here
  // so this module stays dependency-free and tree-shakes cleanly
  // out of the web build.
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (!cap) return false;
  if (typeof cap.isNativePlatform === 'function') {
    return cap.isNativePlatform();
  }
  return true;
}

/**
 * True when running in a regular web context — either an SSR/Node
 * render for the web build, or a browser that is not inside a
 * Capacitor webview. This is the inverse of `isMobileApp()` for
 * the mobile build, and unconditionally true for the web build.
 */
export function isWeb(): boolean {
  return !isMobileApp();
}
