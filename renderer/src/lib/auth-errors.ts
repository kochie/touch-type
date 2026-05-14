// Map Supabase / Postgres errors to user-facing strings.
//
// Raw err.message can leak Postgres table/constraint names from trigger
// errors (auth.users inserts trigger into profiles/settings/subscriptions
// in this project — any constraint violation there bubbles up with the
// public column name and the trigger function name). Toasts and inline
// errors should always go through this mapper; the raw error gets logged
// to Sentry for diagnostics.

import * as Sentry from "@sentry/nextjs";

interface MaybeAuthError {
  message?: string;
  status?: number;
  code?: string;
  name?: string;
}

function asError(e: unknown): MaybeAuthError {
  if (e && typeof e === "object") return e as MaybeAuthError;
  return {};
}

const PATTERNS: Array<[RegExp, string]> = [
  // Supabase auth
  [/invalid login credentials/i,      "Email or password is incorrect."],
  [/email not confirmed/i,            "Please confirm your email to continue."],
  [/user already registered/i,        "An account with that email already exists."],
  [/email rate limit exceeded/i,      "Too many requests. Try again in a minute."],
  [/over.?email.?send.?rate.?limit/i, "Too many requests. Try again in a minute."],
  [/token has expired or is invalid/i, "That code has expired. Request a new one."],
  [/otp.{0,20}(expired|invalid)/i,    "That code didn't match. Try again."],
  [/invalid otp/i,                    "That code didn't match. Try again."],
  [/password.*at least \d+ characters/i, "Password is too short."],
  [/new password should be different/i, "Choose a different password than the current one."],
  [/no.? session|not.? authenticated/i, "You're signed out. Please sign in again."],

  // Postgres-y errors leaking through
  [/duplicate key value/i,            "That value is already in use."],
  [/violates row.?level security/i,   "You don't have permission for that action."],
];

export function friendlyAuthError(err: unknown, fallback: string): string {
  const e = asError(err);
  const raw = (e.message ?? "").trim();

  // Always preserve the raw error for diagnostics — Sentry, not the user.
  try {
    Sentry.captureException(err);
  } catch {
    // Sentry init failure shouldn't break the user-facing flow.
  }

  for (const [re, friendly] of PATTERNS) {
    if (re.test(raw)) return friendly;
  }

  // 429 from any source — usually rate limit.
  if (e.status === 429) return "Too many requests. Try again in a minute.";

  return fallback;
}
