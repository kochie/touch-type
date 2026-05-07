import { test, expect } from "@playwright/test";
import { Client } from "pg";

/**
 * Sign-in writes the user's IANA timezone to profiles.timezone.
 *
 * Why this matters: the streak trigger uses profiles.timezone to bucket
 * activity into the user's local calendar day. If the renderer's
 * ProfileTimezoneSync ever stops firing, streaks silently fall back to UTC
 * and break for users west of UTC.
 *
 * The test creates a fresh user via the GoTrue admin API, signs in via the
 * UI, and asserts profiles.timezone matches the browser's reported zone
 * (pinned to Australia/Melbourne in playwright.config.ts).
 */

const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_KEY = process.env.E2E_SUPABASE_SERVICE_KEY ?? "";
const DB_URL =
  process.env.E2E_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

if (!SERVICE_KEY) {
  throw new Error(
    "E2E_SUPABASE_SERVICE_KEY is required. Run `supabase status -o env` to fetch it."
  );
}

interface AdminUser {
  id: string;
  email: string;
}

async function createTestUser(email: string, password: string): Promise<AdminUser> {
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
    throw new Error(`admin/users create failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<AdminUser>;
}

async function deleteTestUser(id: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
    method: "DELETE",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
}

test.describe("auth timezone sync", () => {
  let userId: string;
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@local.test`;
  const password = "e2e-password-" + Math.random().toString(36).slice(2);

  test.beforeAll(async () => {
    const user = await createTestUser(email, password);
    userId = user.id;
  });

  test.afterAll(async () => {
    if (userId) await deleteTestUser(userId);
  });

  test("ProfileTimezoneSync writes profiles.timezone after login", async ({ page }) => {
    await page.goto("/");

    // Dismiss the "What's New" modal if it shows on first load.
    const niceButton = page.getByRole("button", { name: "Nice!" });
    if (await niceButton.isVisible().catch(() => false)) {
      await niceButton.click();
    }

    await page.getByTitle("Sign In or Sign Up").click();
    await page.getByRole("textbox", { name: "Email address" }).fill(email);
    await page.getByRole("textbox", { name: "Password" }).fill(password);
    await page.getByRole("textbox", { name: "Password" }).press("Enter");

    // After login the menu shows the "Account" affordance instead of sign-in.
    await expect(page.getByTitle("Account")).toBeVisible({ timeout: 15_000 });

    // ProfileTimezoneSync runs in a useEffect after the user state updates;
    // poll the DB until the timezone is written.
    const expectedZone = "Australia/Melbourne";
    const client = new Client({ connectionString: DB_URL });
    await client.connect();
    try {
      await expect
        .poll(
          async () => {
            const { rows } = await client.query<{ timezone: string }>(
              "SELECT timezone FROM public.profiles WHERE id = $1",
              [userId]
            );
            return rows[0]?.timezone ?? null;
          },
          { timeout: 10_000, message: "expected profiles.timezone to be populated" }
        )
        .toBe(expectedZone);
    } finally {
      await client.end();
    }
  });
});
