// Single source of truth for the website URL used by Supabase auth flows
// (password reset magic link, signup confirmation redirects, etc).
//
// Set NEXT_PUBLIC_WEBSITE_URL at build time to point at a non-production
// site (e.g. http://localhost:3000 for local dev, or a Vercel preview URL
// for a release rehearsal). Falls back to the production website when
// unset so plain `pnpm build` keeps working.
//
// NEXT_PUBLIC_* values are inlined at build time by Next.js, so changing
// this env var requires a rebuild — there is no runtime override.

const DEFAULT_WEBSITE_URL = "https://touch-typer.kochie.io";

const websiteUrl = (process.env.NEXT_PUBLIC_WEBSITE_URL ?? DEFAULT_WEBSITE_URL)
  .trim()
  .replace(/\/+$/, "");

/**
 * Magic-link destination for resetPasswordForEmail. Lands on the website's
 * /auth/callback, which exchanges the token and routes to /auth/set-password.
 */
export const PASSWORD_RESET_REDIRECT_URL =
  `${websiteUrl}/auth/callback?next=/auth/set-password`;
