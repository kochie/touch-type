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
 * Sign in (or sign up) via the renderer UI. Navigates to "/" if not already there,
 * dismisses the "What's New" modal if it appears, and waits for the post-login
 * "Account" affordance.
 */
export async function signInUI(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  if (!page.url().endsWith("/")) {
    await page.goto("/");
  }

  const niceButton = page.getByRole("button", { name: "Nice!" });
  if (await niceButton.isVisible().catch(() => false)) {
    await niceButton.click();
  }

  await page.getByTitle("Sign In or Sign Up").click();
  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("textbox", { name: "Password" }).press("Enter");

  await expect(page.getByTitle("Account")).toBeVisible({ timeout: 15_000 });
}
