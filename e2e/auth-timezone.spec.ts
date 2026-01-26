import { test, expect } from "@playwright/test";
import { Client } from "pg";
import {
  createTestUser,
  deleteTestUser,
  signInUI,
  uniqueEmail,
  uniquePassword,
  DB_URL,
} from "./helpers/users";

/**
 * Sign-in writes the user's IANA timezone to profiles.timezone.
 *
 * Why this matters: the streak trigger uses profiles.timezone to bucket
 * activity into the user's local calendar day. If the renderer's
 * ProfileTimezoneSync ever stops firing, streaks silently fall back to UTC
 * and break for users west of UTC.
 */

test.describe("auth timezone sync", () => {
  let userId: string;
  const email = uniqueEmail("e2e-tz");
  const password = uniquePassword();

  test.beforeAll(async () => {
    const user = await createTestUser(email, password);
    userId = user.id;
  });

  test.afterAll(async () => {
    if (userId) await deleteTestUser(userId);
  });

  test("ProfileTimezoneSync writes profiles.timezone after login", async ({ page }) => {
    await page.goto("/");
    await signInUI(page, email, password);

    const expectedZone = "Australia/Melbourne";
    const client = new Client({ connectionString: DB_URL });
    await client.connect();
    try {
      await expect
        .poll(
          async () => {
            const { rows } = await client.query<{ timezone: string }>(
              "SELECT timezone FROM public.profiles WHERE id = $1",
              [userId],
            );
            return rows[0]?.timezone ?? null;
          },
          { timeout: 10_000, message: "expected profiles.timezone to be populated" },
        )
        .toBe(expectedZone);
    } finally {
      await client.end();
    }
  });
});
