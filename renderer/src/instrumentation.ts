import * as Sentry from "@sentry/nextjs";

// This is the SERVER-side Sentry init hook for Next.js (runs in the Node /
// Edge runtimes via `register()` when the dev server starts). It must NOT
// reference browser-only integrations like feedbackIntegration —
// @sentry/nextjs's server bundle doesn't export them, and the import will
// throw `feedbackIntegration is not a function` at dev-server startup.
//
// Browser-side init (including the User Feedback widget) lives in
// instrumentation-client.ts; Next.js auto-loads that file in the renderer.
//
// In production, the renderer is statically exported (next.config.mjs has
// output: "export") so the Next.js server doesn't run at all — this hook
// only fires during `pnpm dev`.

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
