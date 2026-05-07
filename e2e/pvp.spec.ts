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

/**
 * E2E tests for the PvP feature.
 *
 * Coverage:
 *   (a) /pvp smoke — signed-in user can navigate without console errors
 *   (b) Invite-link round-trip — A creates challenge, B accepts via the code
 *   (d.1) Cancel — challenger cancels their pending challenge
 *   (d.2) Decline — opponent declines a direct challenge they received
 *
 * Test data isolation: each test creates its own users and lets ON DELETE
 * CASCADE on pvp_challenges.challenger_id clean up rows when the user is
 * deleted.
 */

async function getInviteCode(
  client: Client,
  challengerId: string,
): Promise<{ challengeId: string; inviteCode: string }> {
  const { rows } = await client.query<{
    challenge_id: string;
    invite_code: string;
  }>(
    `SELECT i.challenge_id, i.invite_code
       FROM public.pvp_challenge_invites i
       JOIN public.pvp_challenges c ON c.id = i.challenge_id
      WHERE c.challenger_id = $1
      ORDER BY i.created_at DESC
      LIMIT 1`,
    [challengerId],
  );
  if (!rows[0]) throw new Error("no invite found for challenger");
  return { challengeId: rows[0].challenge_id, inviteCode: rows[0].invite_code };
}

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

test.describe("pvp", () => {
  // (a) Smoke test — catches the missing-grant / missing-migration class of bug
  test.describe("smoke", () => {
    let userId: string;
    const email = uniqueEmail("e2e-pvp-smoke");
    const password = uniquePassword();

    test.beforeAll(async () => {
      const user = await createTestUser(email, password);
      userId = user.id;
    });

    test.afterAll(async () => {
      if (userId) await deleteTestUser(userId);
    });

    test("authenticated user navigates to /pvp without errors", async ({ page }) => {
      const errors = collectConsoleErrors(page);
      await page.goto("/");
      await signInUI(page, email, password);

      await page.goto("/pvp");
      await expect(
        page.getByRole("heading", { name: "PvP Arena" }),
      ).toBeVisible({ timeout: 10_000 });

      // Hub should land on the "Active" empty state for a brand-new user
      await expect(page.getByText("No active challenges")).toBeVisible({
        timeout: 5_000,
      });

      // No console errors from refreshChallenges / RLS / missing tables
      const pvpErrors = errors.filter((e) =>
        /pvp|challenge|fetch/i.test(e),
      );
      expect(pvpErrors, `unexpected console errors: ${pvpErrors.join("\n")}`)
        .toHaveLength(0);
    });
  });

  // (b) Invite-link round-trip — two browser contexts, full UI flow
  test.describe("invite-link round-trip", () => {
    const challengerEmail = uniqueEmail("e2e-pvp-a");
    const opponentEmail = uniqueEmail("e2e-pvp-b");
    const challengerPassword = uniquePassword();
    const opponentPassword = uniquePassword();
    let challengerId: string;
    let opponentId: string;

    test.beforeAll(async () => {
      challengerId = (await createTestUser(challengerEmail, challengerPassword))
        .id;
      opponentId = (await createTestUser(opponentEmail, opponentPassword)).id;
    });

    test.afterAll(async () => {
      if (challengerId) await deleteTestUser(challengerId);
      if (opponentId) await deleteTestUser(opponentId);
    });

    test("A creates an invite-link challenge, B accepts it", async ({ browser }) => {
      const ctxA = await browser.newContext();
      const ctxB = await browser.newContext();
      const pageA = await ctxA.newPage();
      const pageB = await ctxB.newPage();

      try {
        // ----- User A: create challenge with invite link -----
        await pageA.goto("/");
        await signInUI(pageA, challengerEmail, challengerPassword);
        await pageA.goto("/pvp");
        await pageA.getByRole("button", { name: /New/ }).click();

        await pageA.getByTestId("pvp-invite-toggle").check();
        await pageA.getByTestId("pvp-create-submit").click();

        // Wait for the success state
        await expect(pageA.getByTestId("pvp-challenge-code")).toBeVisible({
          timeout: 10_000,
        });

        // ----- DB lookup: get the invite code A just generated -----
        const client = new Client({ connectionString: DB_URL });
        await client.connect();
        let challengeId: string;
        let inviteCode: string;
        try {
          ({ challengeId, inviteCode } = await getInviteCode(client, challengerId));

          // ----- User B: accept via /pvp/invite?code={inviteCode} -----
          await pageB.goto("/");
          await signInUI(pageB, opponentEmail, opponentPassword);
          await pageB.goto(`/pvp/invite?code=${inviteCode}`);

          await expect(
            pageB.getByRole("heading", { name: /You've Been Challenged/ }),
          ).toBeVisible({ timeout: 10_000 });
          await pageB.getByTestId("pvp-accept-invite").click();

          // ----- DB assertion: status should flip to 'accepted' -----
          await expect
            .poll(
              async () => {
                const { rows } = await client.query<{
                  status: string;
                  opponent_id: string | null;
                }>(
                  "SELECT status, opponent_id FROM public.pvp_challenges WHERE id = $1",
                  [challengeId],
                );
                return rows[0];
              },
              { timeout: 10_000, message: "challenge should be accepted by B" },
            )
            .toEqual({ status: "accepted", opponent_id: opponentId });

          // ----- UI assertion: B's hub shows the now-active challenge -----
          await pageB.goto("/pvp");
          await expect(
            pageB.getByRole("heading", { name: "PvP Arena" }),
          ).toBeVisible({ timeout: 5_000 });
          // "Active" tab is the default; the card renders Play Now
          await expect(pageB.getByRole("button", { name: /Play Now/ }))
            .toBeVisible({ timeout: 10_000 });
        } finally {
          await client.end();
        }
      } finally {
        await ctxA.close();
        await ctxB.close();
      }
    });
  });

  // (d.1) Cancel — challenger cancels via /pvp/challenge?id={challengeId}
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

    test("challenger can cancel their own pending challenge", async ({ page }) => {
      // Setup: insert a pending invite-link challenge for this user
      const client = new Client({ connectionString: DB_URL });
      await client.connect();
      let challengeId: string;
      try {
        const { rows } = await client.query<{ id: string }>(
          `INSERT INTO public.pvp_challenges (
              challenger_id, keyboard, level, language, word_set
           ) VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [userId, "qwerty", "novice", "english", ["the", "and", "of"]],
        );
        challengeId = rows[0].id;

        // Sign in and navigate to the challenge detail page
        await page.goto("/");
        await signInUI(page, email, password);
        await page.goto(`/pvp/challenge?id=${challengeId}`);

        await page.getByTestId("pvp-card-cancel").click();

        // Cancel deletes the row — assert it's gone
        await expect
          .poll(
            async () => {
              const result = await client.query(
                "SELECT 1 FROM public.pvp_challenges WHERE id = $1",
                [challengeId],
              );
              return result.rowCount;
            },
            { timeout: 10_000, message: "expected pvp_challenges row to be deleted" },
          )
          .toBe(0);
      } finally {
        await client.end();
      }
    });
  });

  // (d.2) Decline — opponent declines a direct challenge from the Incoming tab
  test.describe("decline by opponent", () => {
    const challengerEmail = uniqueEmail("e2e-pvp-dx-a");
    const opponentEmail = uniqueEmail("e2e-pvp-dx-b");
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

    test("opponent declines a direct challenge from the Incoming tab", async ({ page }) => {
      const client = new Client({ connectionString: DB_URL });
      await client.connect();
      let challengeId: string;
      try {
        // Setup: A challenges B directly (opponent_id set)
        const { rows } = await client.query<{ id: string }>(
          `INSERT INTO public.pvp_challenges (
              challenger_id, opponent_id, keyboard, level, language, word_set
           ) VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [
            challengerId,
            opponentId,
            "qwerty",
            "novice",
            "english",
            ["the", "and", "of"],
          ],
        );
        challengeId = rows[0].id;

        // B signs in, navigates to /pvp, opens Incoming tab
        await page.goto("/");
        await signInUI(page, opponentEmail, opponentPassword);
        await page.goto("/pvp");
        await page.getByRole("button", { name: /Incoming/ }).click();

        // The challenge card should render with a Decline action
        await expect(page.getByTestId("pvp-card-decline")).toBeVisible({
          timeout: 10_000,
        });
        await page.getByTestId("pvp-card-decline").click();

        // Decline updates status to 'declined' — row stays
        await expect
          .poll(
            async () => {
              const { rows: r } = await client.query<{ status: string }>(
                "SELECT status FROM public.pvp_challenges WHERE id = $1",
                [challengeId],
              );
              return r[0]?.status ?? null;
            },
            { timeout: 10_000, message: "expected status='declined'" },
          )
          .toBe("declined");
      } finally {
        await client.end();
      }
    });
  });
});
