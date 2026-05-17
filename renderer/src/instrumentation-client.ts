import * as Sentry from "@sentry/nextjs";

// Browser-side Sentry init. Next.js (15.3+) auto-loads this file in the
// renderer bundle the same way it auto-loads instrumentation.ts for the
// Node/Edge runtimes. Anything that's browser-only (feedbackIntegration,
// replayIntegration, browserTracingIntegration, etc.) belongs here — not
// in instrumentation.ts, where the server bundle won't have these exports
// and the import throws at dev-server startup.

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn:
    SENTRY_DSN ||
    "https://b91033c73a0f46a287bfaa7959809d12@o157203.ingest.sentry.io/6633710",
  tracesSampleRate: 1.0,
  integrations: [
    // User-initiated feedback. autoInject:false suppresses the floating
    // launcher widget — we wire the form from AboutSettings's "Send
    // Feedback" row via Sentry.getFeedback().attachTo(element).
    Sentry.feedbackIntegration({
      autoInject: false,
      colorScheme: "system",
      isNameRequired: false,
      isEmailRequired: false,
      enableScreenshots: true,
      showBranding: false,
      // Prefill from Sentry.setUser() — supabase-provider applies the
      // signed-in user's id/email/username at every auth state change.
      useSentryUser: {
        email: "email",
        name: "username",
      },
    }),
  ],
});

Sentry.getGlobalScope().setAttributes({
  app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown",
});

// Required export hook for Next.js router instrumentation. Without it
// Next.js will warn that instrumentation-client.ts doesn't export
// onRouterTransitionStart. The Sentry helper is a no-op when transitions
// aren't enabled, which keeps the dev-server start clean.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
