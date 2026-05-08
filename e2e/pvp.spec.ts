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

test.describe("pvp v2", () => {
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
      await expect(page.getByText("No active challenges")).toBeVisible({ timeout: 5_000 });

      const pvpErrors = errors.filter((e) => /pvp|challenge|fetch/i.test(e));
      expect(
        pvpErrors,
        `unexpected console errors: ${pvpErrors.join("\n")}`,
      ).toHaveLength(0);
    });
  });

  // (b) Invite-link round trip — the core regression test
  test.describe("invite-link round-trip", () => {
    const challengerEmail = uniqueEmail("e2e-pvp-a");
    const opponentEmail = uniqueEmail("e2e-pvp-b");
    const challengerPassword = uniquePassword();
    const opponentPassword = uniquePassword();
    let challengerId: string;
    let opponentId: string;

    test.beforeAll(async () => {
      challengerId = (await createTestUser(challengerEmail, challengerPassword)).id;
      opponentId = (await createTestUser(opponentEmail, opponentPassword)).id;
    });
    test.afterAll(async () => {
      if (challengerId) await deleteTestUser(challengerId);
      if (opponentId) await deleteTestUser(opponentId);
    });

    test("A creates by racing, B claims and races, both see completed", async ({ browser }) => {
      const ctxA = await browser.newContext();
      const ctxB = await browser.newContext();
      const pageA = await ctxA.newPage();
      const pageB = await ctxB.newPage();

      try {
        // A signs in, navigates to PvP
        await pageA.goto("/");
        await signInUI(pageA, challengerEmail, challengerPassword);

        // Insert A's challenge directly (skipping the typing UI for speed/determinism).
        const client = new Client({ connectionString: DB_URL });
        await client.connect();
        try {
          const { rows } = await client.query<{ id: string; invite_code: string }>(
            `INSERT INTO public.pvp_challenges (
                challenger_id, challenger_cpm, challenger_correct, challenger_incorrect,
                challenger_time, keyboard, level, language, word_set
              ) VALUES ($1, 80, 50, 2, 'PT30S', 'qwerty', 'novice', 'english',
                ARRAY['the','and','of','to','in','it','is','of','at','as','by','do','if','my','on'])
              RETURNING id, invite_code`,
            [challengerId],
          );
          const inviteCode = rows[0].invite_code;
          const challengeId = rows[0].id;

          // B navigates to /pvp/invite?code=
          await pageB.goto("/");
          await signInUI(pageB, opponentEmail, opponentPassword);
          await pageB.goto(`/pvp/invite?code=${inviteCode}`);
          await expect(pageB.getByTestId("pvp-accept-invite")).toBeVisible({ timeout: 10_000 });
          await pageB.getByTestId("pvp-accept-invite").click();

          // After claiming, B is taken to /pvp/race?id=
          await pageB.waitForURL(/\/pvp\/race\?id=/);

          // Drive the opponent submission via DB (skips typing):
          await client.query(
            `UPDATE public.pvp_challenges
                SET opponent_cpm = 90, opponent_correct = 51, opponent_incorrect = 1,
                    opponent_time = 'PT28S', opponent_completed_at = NOW(),
                    status = 'completed'
              WHERE id = $1 AND opponent_id = $2`,
            [challengeId, opponentId],
          );

          // Both pages, navigated to /pvp/challenge?id={id}, should see the completed view.
          await pageA.goto(`/pvp/challenge?id=${challengeId}`);
          await expect(pageA.getByText("You lost")).toBeVisible({ timeout: 10_000 });

          await pageB.goto(`/pvp/challenge?id=${challengeId}`);
          await expect(pageB.getByText("You won!")).toBeVisible({ timeout: 10_000 });

          // DB invariants
          const { rows: r } = await client.query<{
            status: string;
            winner_id: string;
          }>(
            "SELECT status, winner_id FROM public.pvp_challenges WHERE id = $1",
            [challengeId],
          );
          expect(r[0].status).toBe("completed");
          expect(r[0].winner_id).toBe(opponentId);
        } finally {
          await client.end();
        }
      } finally {
        await ctxA.close();
        await ctxB.close();
      }
    });
  });

  // (c) Cancel
  test.describe("cancel by challenger", () => {
    const email = uniqueEmail("e2e-pvp-cancel");
    const password = uniquePassword();
    let userId: string;

    test.beforeAll(async () => {
      userId = (await createTestUser(email, password)).id;
    });
    test.afterAll(async () => {
      if (userId) await deleteTestUser(userId);
    });

    test("challenger cancels via Outgoing tab", async ({ page }) => {
      const client = new Client({ connectionString: DB_URL });
      await client.connect();
      let challengeId: string;
      try {
        const { rows } = await client.query<{ id: string }>(
          `INSERT INTO public.pvp_challenges (
              challenger_id, challenger_cpm, challenger_correct, challenger_incorrect,
              challenger_time, keyboard, level, language, word_set
            ) VALUES ($1, 80, 50, 2, 'PT30S', 'qwerty', 'novice', 'english',
              ARRAY['the','and','of'])
            RETURNING id`,
          [userId],
        );
        challengeId = rows[0].id;

        await page.goto("/");
        await signInUI(page, email, password);
        await page.goto("/pvp");
        await page.getByTestId("pvp-tab-outgoing").click();
        await page.getByTestId("pvp-card-cancel").click();

        await expect
          .poll(
            async () => {
              const { rows: r } = await client.query<{ status: string }>(
                "SELECT status FROM public.pvp_challenges WHERE id = $1",
                [challengeId],
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

  // (d) Already-claimed
  test.describe("already-claimed invite", () => {
    const aEmail = uniqueEmail("e2e-pvp-ac-a");
    const bEmail = uniqueEmail("e2e-pvp-ac-b");
    const cEmail = uniqueEmail("e2e-pvp-ac-c");
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

    test("third user opening a claimed invite sees claimed status", async ({ page }) => {
      const client = new Client({ connectionString: DB_URL });
      await client.connect();
      try {
        const { rows } = await client.query<{ id: string; invite_code: string }>(
          `INSERT INTO public.pvp_challenges (
              challenger_id, challenger_cpm, challenger_correct, challenger_incorrect,
              challenger_time, keyboard, level, language, word_set
            ) VALUES ($1, 80, 50, 2, 'PT30S', 'qwerty', 'novice', 'english',
              ARRAY['the','and','of'])
            RETURNING id, invite_code`,
          [aId],
        );
        const challengeId = rows[0].id;
        const inviteCode = rows[0].invite_code;

        // B claims directly via DB
        await client.query(
          `UPDATE public.pvp_challenges
              SET opponent_id = $2, opponent_claimed_at = NOW(), status = 'claimed'
            WHERE id = $1`,
          [challengeId, bId],
        );

        // C opens the invite link and sees claimed
        await page.goto("/");
        await signInUI(page, cEmail, cPassword);
        await page.goto(`/pvp/invite?code=${inviteCode}`);
        await expect(page.getByText(/this challenge is claimed/i)).toBeVisible({
          timeout: 10_000,
        });
      } finally {
        await client.end();
      }
    });
  });
});
