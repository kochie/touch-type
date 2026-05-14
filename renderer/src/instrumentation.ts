import * as Sentry from "@sentry/nextjs";
import { Temporal, toTemporalInstant } from "temporal-polyfill";

// Polyfill `Temporal` for the Node.js server environment used by `next dev`.
// In production the app is statically exported and runs in Chromium (Electron),
// which has native Temporal support — this polyfill only ever activates on the
// server side during development and e2e test runs.
if (typeof globalThis.Temporal === "undefined") {
  Object.defineProperty(globalThis, "Temporal", {
    value: Temporal,
    writable: false,
    configurable: false,
  });
}
if (typeof Date.prototype.toTemporalInstant === "undefined") {
  Date.prototype.toTemporalInstant = toTemporalInstant;
}

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

export function register() {
  Sentry.init({
    dsn:
      SENTRY_DSN ||
      "https://b91033c73a0f46a287bfaa7959809d12@o157203.ingest.sentry.io/6633710",
    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: 1.0,
    // ...
    // Note: if you want to override the automatic release value, do not set a
    // `release` value here - use the environment variable `SENTRY_RELEASE`, so
    // that it will also get attached to your source maps
  });

  Sentry.getGlobalScope().setAttributes({
    app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown",
  });
}
