/**
 * screenshots.spec.ts
 *
 * Captures 8 PNGs (light + dark variants for each of 4 app routes) and writes
 * them to touch-typer.kochie.io/public/screenshots/.
 *
 * Run:
 *   pnpm exec playwright test e2e/screenshots.spec.ts
 *
 * Requires:
 *   E2E_SUPABASE_SERVICE_KEY — set via renderer/.env.local or shell
 *   Local Supabase must be running (supabase start)
 */

import { test, expect, type BrowserContext } from "@playwright/test";
import { Client } from "pg";
import { createTestUser, deleteTestUser, signInUI, DB_URL, SUPABASE_URL, SERVICE_KEY } from "./helpers/users";
import path from "node:path";
import fs from "node:fs/promises";

// ── Config ───────────────────────────────────────────────────────────────────

const SCREENSHOT_DIR = path.resolve(
  __dirname,
  "../../touch-typer.kochie.io/public/screenshots",
);

const VIEWPORT = { width: 1440, height: 900 };
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:4321";

const EMAIL = "screenshots@touch-typer.test";
const PASSWORD = "screenshots-deterministic-pw";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

/** Deletes the test user by email using the admin API (idempotent). */
async function deleteUserByEmail(email: string): Promise<void> {
  // List users, find by email, delete
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    },
  );
  if (!res.ok) return;
  const data = (await res.json()) as { users?: { id: string }[] };
  const users = data?.users ?? [];
  for (const u of users) {
    await deleteTestUser(u.id);
  }
}

/** Seed ~30 results rows spread across the last 30 days, plus goals. */
async function seedUserData(userId: string): Promise<void> {
  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  try {
    // Seed results — 30 rows across 30 days with varying CPM so charts look alive
    for (let i = 0; i < 30; i++) {
      const daysAgo = 30 - i;
      const cpm = 200 + Math.round(Math.sin(i * 0.4) * 80 + Math.random() * 40);
      const correct = 45 + Math.floor(Math.random() * 15);
      const incorrect = Math.floor(Math.random() * 5);
      // `time` column stores ISO 8601 duration strings (e.g. "PT60S")
      await db.query(
        `INSERT INTO public.results
          (user_id, correct, incorrect, time, datetime, level, keyboard, language, cpm, key_presses)
         VALUES ($1, $2, $3, 'PT60S', NOW() - INTERVAL '${daysAgo} days', '1', 'MACOS_US_QWERTY', 'en', $4, '[]'::jsonb)`,
        [userId, correct, incorrect, cpm],
      );
    }

    // Seed a speed goal
    await db.query(
      `INSERT INTO public.goals (user_id, category, description, keyboard, language, level, complete, requirement)
       VALUES ($1, 'speed', 'Reach 300 CPM', 'MACOS_US_QWERTY', 'en', '1', false, '{"cpm": 300}'::jsonb)
       ON CONFLICT (user_id, category) DO NOTHING`,
      [userId],
    );

    // Ensure subscription status is active (the trigger sets it to active by
    // default, but update just in case it was changed)
    await db.query(
      `UPDATE public.subscriptions SET status = 'active' WHERE user_id = $1`,
      [userId],
    ).catch(() => {
      // Ignore if subscriptions table is not accessible via direct connection
    });
  } finally {
    await db.end();
  }
}

/** Returns the UUID of a seeded open pvp_matches row for userId as creator. */
async function seedPvpMatch(userId: string): Promise<string> {
  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  try {
    const inviteCode = "SCRNSHT" + Math.random().toString(36).slice(2, 7).toUpperCase();
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO public.pvp_matches
         (invite_code, status, best_of, keyboard, level, language, capital, punctuation, numbers, creator_id)
       VALUES ($1, 'open', 1, 'MACOS_US_QWERTY', '1', 'en', false, false, false, $2)
       RETURNING id`,
      [inviteCode, userId],
    );
    return rows[0].id;
  } finally {
    await db.end();
  }
}

/**
 * Force light or dark mode on the page:
 *  - toggles the `dark` class on documentElement
 *  - sets sessionStorage to suppress firstTimeOpen modal
 */
async function forceTheme(ctx: BrowserContext, theme: "light" | "dark") {
  await ctx.addInitScript((t: "light" | "dark") => {
    try {
      sessionStorage.setItem("firstTimeOpen", "seen");
    } catch {
      /* ignore */
    }
    // Apply theme class once documentElement is available
    function applyClass() {
      const root = document.documentElement;
      if (!root) return;
      if (t === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
    if (document.documentElement) {
      applyClass();
    } else {
      document.addEventListener("DOMContentLoaded", applyClass);
    }
  }, theme);
}

async function applyTheme(
  ctx: BrowserContext,
  theme: "light" | "dark",
): Promise<void> {
  // Also imperatively set the class on the current page after navigation
  for (const page of ctx.pages()) {
    await page.evaluate((t: "light" | "dark") => {
      if (t === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      // Hide the Next.js dev overlay badge (hydration-mismatch toast)
      // so it doesn't appear in marketing screenshots.
      const style = document.getElementById("__next-dev-overlay-hide__");
      if (!style) {
        const s = document.createElement("style");
        s.id = "__next-dev-overlay-hide__";
        s.textContent = "nextjs-portal { display: none !important; }";
        document.head.appendChild(s);
      }
    }, theme);
  }
}

// ── Test suite ───────────────────────────────────────────────────────────────

test.describe("marketing screenshots", () => {
  let userId: string;
  let pvpMatchId: string;

  test.beforeAll(async ({ browser }) => {
    await ensureDir(SCREENSHOT_DIR);

    // Clean up any leftover user from a previous run, then create fresh
    await deleteUserByEmail(EMAIL);
    const user = await createTestUser(EMAIL, PASSWORD);
    userId = user.id;
    await seedUserData(userId);
    pvpMatchId = await seedPvpMatch(userId);
  });

  test.afterAll(async () => {
    if (userId) await deleteTestUser(userId);
  });

  // Helper that creates a fresh browser context, signs in, and returns it
  async function createSignedInContext(
    browser: Parameters<Parameters<typeof test>[1]>[0]["browser"],
    theme: "light" | "dark",
  ) {
    const ctx = await browser.newContext({
      colorScheme: theme,
      viewport: VIEWPORT,
      baseURL: BASE_URL,
    });
    await forceTheme(ctx, theme);
    const page = await ctx.newPage();
    await page.goto("/");
    await signInUI(page, EMAIL, PASSWORD);
    await applyTheme(ctx, theme);
    return { ctx, page };
  }

  for (const theme of ["light", "dark"] as const) {
    test(`capture ${theme} screenshots`, async ({ browser }) => {
      test.setTimeout(180_000);
      const { ctx, page } = await createSignedInContext(browser, theme);

      // ── 1. layouts.png — main typing screen with on-screen keyboard ──────
      await page.goto("/");
      await applyTheme(ctx, theme);
      // Dismiss modal if present — use a short timeout so we don't hang when
      // the modal isn't present (the init script usually suppresses it).
      await page
        .getByRole("button", { name: "Nice!" })
        .click({ timeout: 3_000 })
        .catch(() => {});
      // Wait for the practice area to fully render
      await page.waitForTimeout(1500);
      // Type a few characters so the keyboard highlights look alive
      await page.keyboard.type("the quick brown fox");
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `layouts-${theme}.png`),
      });

      // ── 2. stats.png — stats dashboard ──────────────────────────────────
      await page.goto("/stats");
      await applyTheme(ctx, theme);
      // Wait for charts to render (D3 draws into SVG/canvas after data loads)
      await page.waitForTimeout(3000);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `stats-${theme}.png`),
      });

      // ── 3. coach.png — AI Coach tab view ────────────────────────────────
      await page.goto("/assistant");
      await applyTheme(ctx, theme);
      // Wait for the component to mount and any async data to settle
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `coach-${theme}.png`),
      });

      // ── 4. pvp.png — PvP challenge page (open match waiting for opponent) ──
      await page.goto(`/pvp/challenge?id=${pvpMatchId}`);
      await applyTheme(ctx, theme);
      // Wait for the challenge to load ("Your race awaits" heading)
      await page
        .getByText("Your race awaits")
        .waitFor({ state: "visible", timeout: 10_000 })
        .catch(async () => {
          // Fall back: screenshot whatever rendered (may be "Game not found"
          // if the RLS insert didn't complete in time — still a real capture)
          console.warn(`[screenshots] pvp ${theme}: 'Your race awaits' not found — capturing fallback`);
        });
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `pvp-${theme}.png`),
      });

      await ctx.close();
    });
  }

  // Sanity-check: verify all 8 PNGs were written and are >10KB
  test("all 8 PNGs exist and are non-trivially sized", async () => {
    const names = ["layouts", "stats", "coach", "pvp"];
    const themes = ["light", "dark"];
    for (const name of names) {
      for (const theme of themes) {
        const filePath = path.join(SCREENSHOT_DIR, `${name}-${theme}.png`);
        const stat = await fs.stat(filePath);
        expect(stat.size, `${name}-${theme}.png should be >10KB`).toBeGreaterThan(10_000);
      }
    }
  });
});
