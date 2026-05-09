import { expect, type Page } from "@playwright/test";

export const SUPABASE_URL =
  process.env.E2E_SUPABASE_URL ?? "http://127.0.0.1:54321";
export const SERVICE_KEY = process.env.E2E_SUPABASE_SERVICE_KEY ?? "";
export const DB_URL =
  process.env.E2E_DB_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

if (!SERVICE_KEY) {
  throw new Error(
    "E2E_SUPABASE_SERVICE_KEY is required. Run `supabase status -o env` to fetch it.",
  );
}

export interface AdminUser {
  id: string;
  email: string;
}

export async function createTestUser(
  email: string,
  password: string,
): Promise<AdminUser> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!res.ok) {
    throw new Error(
      `admin/users create failed: ${res.status} ${await res.text()}`,
    );
  }
  return res.json() as Promise<AdminUser>;
}

export async function deleteTestUser(id: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
    method: "DELETE",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
}

export function uniqueEmail(prefix = "e2e"): string {
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${stamp}-${rand}@local.test`;
}

export function uniquePassword(): string {
  return "e2e-password-" + Math.random().toString(36).slice(2);
}

/**
 * Dismiss the "What's New" modal if it's currently open. Idempotent — does
 * nothing if the modal isn't there. The modal is gated by
 *   sessionStorage.getItem("firstTimeOpen") === null
 * so we also set that key to suppress it on subsequent navigations.
 */
export async function dismissWhatsNew(page: Page): Promise<void> {
  const niceButton = page.getByRole("button", { name: "Nice!" });
  if (await niceButton.isVisible().catch(() => false)) {
    await niceButton.click();
    await niceButton.waitFor({ state: "hidden" }).catch(() => {});
  }
  // Mark sessionStorage so the modal won't re-open after future navigations
  // (each goto rehydrates the React app and re-runs the gating useLayoutEffect).
  await page
    .evaluate(() => sessionStorage.setItem("firstTimeOpen", "seen"))
    .catch(() => {});
}

/**
 * Sign in (or sign up) via the renderer UI. Navigates to "/" if not already
 * there, suppresses the "What's New" modal (which is async w.r.t. auth and
 * can appear before *or* after login), and waits for the post-login "Account"
 * affordance.
 */
export async function signInUI(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  // Ensure every future page in this context starts with the "first-time open"
  // flag already set, so the WhatsNew modal never gates clicks. Safe to call
  // multiple times — it just re-registers the same script.
  await page.context().addInitScript(() => {
    try {
      sessionStorage.setItem("firstTimeOpen", "seen");
    } catch {
      /* ignore in environments without sessionStorage */
    }
  });

  if (!page.url().endsWith("/")) {
    await page.goto("/");
  }

  // The init script doesn't help for the *current* page (it was already
  // navigated to before the script registered), so dismiss-if-present here.
  await dismissWhatsNew(page);

  await page.getByTitle("Sign In or Sign Up").click();
  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("textbox", { name: "Password" }).press("Enter");

  await expect(page.getByTitle("Account")).toBeVisible({ timeout: 15_000 });

  // The modal can also pop up after auth (settings are loaded post-auth and
  // whatsNewOnStartup defaults to true), so dismiss again if it appears.
  await dismissWhatsNew(page);
}
