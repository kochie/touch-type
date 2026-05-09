import { test, expect, type Page, type ConsoleMessage } from "@playwright/test";
import { Client } from "pg";
import {
  createTestUser,
  deleteTestUser,
  signInUI,
  uniqueEmail,
  uniquePassword,
  DB_URL,
} from "./helpers/users";

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

test.describe("pvp v3", () => {
  // (a) Smoke
  test.describe("smoke", () => {
    let userId: string;
    const email = uniqueEmail("e2e-pvp-smoke");
    const password = uniquePassword();

    test.beforeAll(async () => {
      userId = (await createTestUser(email, password)).id;
    });
    test.afterAll(async () => {
      if (userId) await deleteTestUser(userId);
    });

    test("authenticated user navigates to /pvp without errors", async ({ page }) => {
      const errors = collectConsoleErrors(page);
      await page.goto("/");
      await signInUI(page, email, password);

      await page.goto("/pvp");
      await expect(page.getByRole("heading", { name: "PvP Arena" })).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByText("No active games")).toBeVisible({ timeout: 5_000 });

      // Filter narrowly — generic /fetch/i matches unrelated platform errors
      // (e.g. settings sync racing with the prior test's afterAll cleanup).
      const pvpErrors = errors.filter((e) =>
        /pvp_games|Error fetching games|Error joining game|invite_code/i.test(e),
      );
      expect(
        pvpErrors,
        `unexpected console errors: ${pvpErrors.join("\n")}`,
      ).toHaveLength(0);
    });
  });

  // (b) Round-trip — A creates, B joins, both race (DB-direct), both see results
  test.describe("blind round-trip", () => {
    const aEmail = uniqueEmail("e2e-pvp-a");
    const bEmail = uniqueEmail("e2e-pvp-b");
    const aPassword = uniquePassword();
    const bPassword = uniquePassword();
    let aId: string;
    let bId: string;

    test.beforeAll(async () => {
      aId = (await createTestUser(aEmail, aPassword)).id;
      bId = (await createTestUser(bEmail, bPassword)).id;
    });
    test.afterAll(async () => {
      if (aId) await deleteTestUser(aId);
      if (bId) await deleteTestUser(bId);
    });

    test("A creates, B joins via invite, both race blind, both see results", async ({ browser }) => {
      const ctxA = await browser.newContext();
      const ctxB = await browser.newContext();
      const pageA = await ctxA.newPage();
      const pageB = await ctxB.newPage();

      try {
        // Insert A's game directly (skipping the New tab's UI).
        const client = new Client({ connectionString: DB_URL });
        await client.connect();
        try {
          const { rows } = await client.query<{ id: string; invite_code: string }>(
            `INSERT INTO public.pvp_games (
                creator_id, keyboard, level, language, word_set
              ) VALUES ($1, 'qwerty', 'novice', 'english',
                ARRAY['the','and','of','to','in','it','is','of','at','as','by','do','if','my','on'])
              RETURNING id, invite_code`,
            [aId],
          );
          const inviteCode = rows[0].invite_code;
          const gameId = rows[0].id;

          // B signs in, opens the invite, clicks Join & Play
          await pageB.goto("/");
          await signInUI(pageB, bEmail, bPassword);
          await pageB.goto(`/pvp/invite?code=${inviteCode}`);
          await expect(pageB.getByTestId("pvp-accept-invite")).toBeVisible({
            timeout: 10_000,
          });
          await pageB.getByTestId("pvp-accept-invite").click();
          await pageB.waitForURL(/\/$/);
          await expect(pageB.getByTestId("pvp-mode-banner")).toBeVisible({
            timeout: 10_000,
          });

          // Drive both submissions via DB. Joiner first, then creator —
          // exercises the trigger that flips status='completed' on the second
          // submit and computes winner_id.
          await client.query(
            `UPDATE public.pvp_games
                SET joiner_cpm = 90, joiner_correct = 51, joiner_incorrect = 1,
                    joiner_time = 'PT28S', joiner_completed_at = NOW()
              WHERE id = $1 AND joiner_id = $2`,
            [gameId, bId],
          );
          await client.query(
            `UPDATE public.pvp_games
                SET creator_cpm = 80, creator_correct = 50, creator_incorrect = 2,
                    creator_time = 'PT30S', creator_completed_at = NOW()
              WHERE id = $1 AND creator_id = $2`,
            [gameId, aId],
          );

          // A signs in and views the completed game
          await pageA.goto("/");
          await signInUI(pageA, aEmail, aPassword);
          await pageA.goto(`/pvp/match?id=${gameId}`);
          await expect(pageA.getByText("You lost")).toBeVisible({ timeout: 10_000 });

          // B already signed in
          await pageB.goto(`/pvp/match?id=${gameId}`);
          await expect(pageB.getByText("You won!")).toBeVisible({ timeout: 10_000 });

          // DB invariants
          const { rows: r } = await client.query<{
            status: string;
            winner_id: string;
          }>(
            "SELECT status, winner_id FROM public.pvp_games WHERE id = $1",
            [gameId],
          );
          expect(r[0].status).toBe("completed");
          expect(r[0].winner_id).toBe(bId);
        } finally {
          await client.end();
        }
      } finally {
        await ctxA.close();
        await ctxB.close();
      }
    });
  });

  // (c) Cancel — creator cancels via the game detail page
  test.describe("cancel by creator", () => {
    const email = uniqueEmail("e2e-pvp-cancel");
    const password = uniquePassword();
    let userId: string;

    test.beforeAll(async () => {
      userId = (await createTestUser(email, password)).id;
    });
    test.afterAll(async () => {
      if (userId) await deleteTestUser(userId);
    });

    test("creator cancels via game detail page", async ({ page }) => {
      const client = new Client({ connectionString: DB_URL });
      await client.connect();
      let gameId: string;
      try {
        const { rows } = await client.query<{ id: string }>(
          `INSERT INTO public.pvp_games (
              creator_id, keyboard, level, language, word_set
            ) VALUES ($1, 'qwerty', 'novice', 'english',
              ARRAY['the','and','of'])
            RETURNING id`,
          [userId],
        );
        gameId = rows[0].id;

        await page.goto("/");
        await signInUI(page, email, password);
        await page.goto(`/pvp/match?id=${gameId}`);
        await page.getByTestId("pvp-cancel-match").click();

        await expect
          .poll(
            async () => {
              const { rows: r } = await client.query<{ status: string }>(
                "SELECT status FROM public.pvp_games WHERE id = $1",
                [gameId],
              );
              return r[0]?.status ?? null;
            },
            { timeout: 10_000, message: "expected status='cancelled'" },
          )
          .toBe("cancelled");
      } finally {
        await client.end();
      }
    });
  });

  // (d) Already-joined — third user opening a fully-joined invite sees the closed state
  test.describe("already-joined invite", () => {
    const aEmail = uniqueEmail("e2e-pvp-aj-a");
    const bEmail = uniqueEmail("e2e-pvp-aj-b");
    const cEmail = uniqueEmail("e2e-pvp-aj-c");
    const aPassword = uniquePassword();
    const bPassword = uniquePassword();
    const cPassword = uniquePassword();
    let aId: string, bId: string, cId: string;

    test.beforeAll(async () => {
      aId = (await createTestUser(aEmail, aPassword)).id;
      bId = (await createTestUser(bEmail, bPassword)).id;
      cId = (await createTestUser(cEmail, cPassword)).id;
    });
    test.afterAll(async () => {
      if (aId) await deleteTestUser(aId);
      if (bId) await deleteTestUser(bId);
      if (cId) await deleteTestUser(cId);
    });

    test("third user opening a joined invite sees the closed state", async ({ page }) => {
      const client = new Client({ connectionString: DB_URL });
      await client.connect();
      try {
        const { rows } = await client.query<{ id: string; invite_code: string }>(
          `INSERT INTO public.pvp_games (
              creator_id, joiner_id, joiner_joined_at, keyboard, level, language, word_set
            ) VALUES ($1, $2, NOW(), 'qwerty', 'novice', 'english',
              ARRAY['the','and','of'])
            RETURNING id, invite_code`,
          [aId, bId],
        );
        const inviteCode = rows[0].invite_code;

        await page.goto("/");
        await signInUI(page, cEmail, cPassword);
        await page.goto(`/pvp/invite?code=${inviteCode}`);
        await expect(
          page.getByText(/someone else has already joined/i),
        ).toBeVisible({ timeout: 10_000 });
      } finally {
        await client.end();
      }
    });
  });
});
