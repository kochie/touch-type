import * as Sentry from "@sentry/nextjs";

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
        // Prefill from whatever the app has called Sentry.setUser() with.
        // Currently no caller does, but adding it now means a future
        // "Sentry.setUser({ email })" hook in supabase-provider just works.
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
}
