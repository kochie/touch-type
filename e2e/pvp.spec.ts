import { test, expect, type Page, type ConsoleMessage } from "@playwright/test";
import { Client } from "pg";
import {
  createTestUser, deleteTestUser, signInUI,
  uniqueEmail, uniquePassword, DB_URL,
} from "./helpers/users";

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

test.describe("pvp v4", () => {
  // (a) Smoke
  test.describe("smoke", () => {
    let userId: string;
    const email = uniqueEmail("e2e-pvp4-smoke");
    const password = uniquePassword();
    test.beforeAll(async () => { userId = (await createTestUser(email, password)).id; });
    test.afterAll(async () => { if (userId) await deleteTestUser(userId); });

    test("authenticated user navigates to /pvp without errors", async ({ page }) => {
      const errors = collectConsoleErrors(page);
      await page.goto("/");
      await signInUI(page, email, password);
      await page.goto("/pvp");
      await expect(page.getByRole("heading", { name: "PvP Arena" })).toBeVisible({ timeout: 10_000 });
      await expect(page.getByTestId("pvp-tab-active")).toBeVisible();
      await expect(page.getByTestId("pvp-tab-rivals")).toBeVisible();
      const pvpErrors = errors.filter((e) =>
        /pvp_matches|pvp_games|create_match|join_match|submit_round|invite_code/i.test(e),
      );
      expect(pvpErrors, `unexpected console errors: ${pvpErrors.join("\n")}`).toHaveLength(0);
    });
  });

  // (b) Sequential round-trip — A wins BO3 2-0-1
  test.describe("sequential round-trip", () => {
    const aEmail = uniqueEmail("e2e-pvp4-seq-a");
    const bEmail = uniqueEmail("e2e-pvp4-seq-b");
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

    test("A creates BO3, both race all 3 rounds, A wins 2-1", async ({ browser }) => {
      const ctxA = await browser.newContext();
      const ctxB = await browser.newContext();
      const pageA = await ctxA.newPage();
      const pageB = await ctxB.newPage();
      const client = new Client({ connectionString: DB_URL });
      await client.connect();
      try {
        const { rows: m } = await client.query<{ id: string; invite_code: string }>(`
          SELECT * FROM public.create_match_as($1, 'qwerty','novice','english',false,false,false,
            3, '[["the","and","of"],["to","in","it"],["is","at","by"]]'::jsonb, NULL)`,
          [aId],
        );
        const matchId = m[0].id;
        const inviteCode = m[0].invite_code;

        await pageB.goto("/");
        await signInUI(pageB, bEmail, bPassword);
        await pageB.goto(`/pvp/invite?code=${inviteCode}`);
        await pageB.getByTestId("pvp-accept-invite").click();
        await pageB.waitForURL(/\/$/);

        await client.query(`SELECT public.submit_round_result_as($1,$2,1,90,50,0,'PT30S',NULL)`, [aId, matchId]);
        await client.query(`SELECT public.submit_round_result_as($1,$2,1,70,50,0,'PT30S',NULL)`, [bId, matchId]);
        await client.query(`SELECT public.submit_round_result_as($1,$2,2,70,50,0,'PT30S',NULL)`, [aId, matchId]);
        await client.query(`SELECT public.submit_round_result_as($1,$2,2,90,50,0,'PT30S',NULL)`, [bId, matchId]);
        await client.query(`SELECT public.submit_round_result_as($1,$2,3,90,50,0,'PT30S',NULL)`, [aId, matchId]);
        await client.query(`SELECT public.submit_round_result_as($1,$2,3,70,50,0,'PT30S',NULL)`, [bId, matchId]);

        await pageA.goto("/");
        await signInUI(pageA, aEmail, aPassword);
        await pageA.goto(`/pvp/match?id=${matchId}`);
        await expect(pageA.getByText("You won!")).toBeVisible({ timeout: 10_000 });

        await pageB.goto(`/pvp/match?id=${matchId}`);
        await expect(pageB.getByText("You lost")).toBeVisible({ timeout: 10_000 });

        const { rows: r } = await client.query<{ status: string; winner_id: string; creator_wins: number; joiner_wins: number }>(
          `SELECT status, winner_id, creator_wins, joiner_wins FROM public.pvp_matches WHERE id = $1`,
          [matchId],
        );
        expect(r[0].status).toBe("completed");
        expect(r[0].winner_id).toBe(aId);
        expect(r[0].creator_wins).toBe(2);
        expect(r[0].joiner_wins).toBe(1);
      } finally {
        await client.end();
        await ctxA.close();
        await ctxB.close();
      }
    });
  });

  // (c) Catch-up
  test.describe("catch-up from behind", () => {
    const aEmail = uniqueEmail("e2e-pvp4-catch-a");
    const bEmail = uniqueEmail("e2e-pvp4-catch-b");
    const aPassword = uniquePassword();
    const bPassword = uniquePassword();
    let aId: string, bId: string;
    test.beforeAll(async () => {
      aId = (await createTestUser(aEmail, aPassword)).id;
      bId = (await createTestUser(bEmail, bPassword)).id;
    });
    test.afterAll(async () => {
      if (aId) await deleteTestUser(aId);
      if (bId) await deleteTestUser(bId);
    });

    test("B races all 3 first; status stays open; A then races and loses 0-3", async () => {
      const client = new Client({ connectionString: DB_URL });
      await client.connect();
      try {
        const { rows: m } = await client.query<{ id: string }>(`
          SELECT id FROM public.create_match_as($1, 'qwerty','novice','english',false,false,false,
            3, '[["a"],["b"],["c"]]'::jsonb, NULL)`,
          [aId],
        );
        const matchId = m[0].id;
        await client.query(`SELECT public.join_match_by_invite_as($1,
          (SELECT invite_code FROM public.pvp_matches WHERE id=$2))`, [bId, matchId]);

        await client.query(`SELECT public.submit_round_result_as($1,$2,1,90,50,0,'PT30S',NULL)`, [bId, matchId]);
        await client.query(`SELECT public.submit_round_result_as($1,$2,2,90,50,0,'PT30S',NULL)`, [bId, matchId]);
        await client.query(`SELECT public.submit_round_result_as($1,$2,3,90,50,0,'PT30S',NULL)`, [bId, matchId]);

        let status = await client.query<{ status: string }>(`SELECT status FROM public.pvp_matches WHERE id=$1`, [matchId]);
        expect(status.rows[0].status).toBe("open");

        await client.query(`SELECT public.submit_round_result_as($1,$2,1,70,50,0,'PT30S',NULL)`, [aId, matchId]);
        status = await client.query(`SELECT status FROM public.pvp_matches WHERE id=$1`, [matchId]);
        expect(status.rows[0].status).toBe("in_progress");

        await client.query(`SELECT public.submit_round_result_as($1,$2,2,70,50,0,'PT30S',NULL)`, [aId, matchId]);
        status = await client.query(`SELECT status FROM public.pvp_matches WHERE id=$1`, [matchId]);
        expect(status.rows[0].status).toBe("in_progress");

        await client.query(`SELECT public.submit_round_result_as($1,$2,3,70,50,0,'PT30S',NULL)`, [aId, matchId]);
        const { rows } = await client.query<{ status: string; winner_id: string }>(
          `SELECT status, winner_id FROM public.pvp_matches WHERE id=$1`, [matchId]);
        expect(rows[0].status).toBe("completed");
        expect(rows[0].winner_id).toBe(bId);
      } finally {
        await client.end();
      }
    });
  });

  // (d) Forfeit
  test.describe("forfeit", () => {
    const aEmail = uniqueEmail("e2e-pvp4-ff-a");
    const bEmail = uniqueEmail("e2e-pvp4-ff-b");
    const aPassword = uniquePassword();
    const bPassword = uniquePassword();
    let aId: string, bId: string;
    test.beforeAll(async () => {
      aId = (await createTestUser(aEmail, aPassword)).id;
      bId = (await createTestUser(bEmail, bPassword)).id;
    });
    test.afterAll(async () => {
      if (aId) await deleteTestUser(aId);
      if (bId) await deleteTestUser(bId);
    });

    test("B forfeits a BO5 mid-match, A wins by forfeit", async () => {
      const client = new Client({ connectionString: DB_URL });
      await client.connect();
      try {
        const { rows: m } = await client.query<{ id: string }>(`
          SELECT id FROM public.create_match_as($1,'qwerty','novice','english',false,false,false,
            5, '[["a"],["b"],["c"],["d"],["e"]]'::jsonb, NULL)`, [aId]);
        const matchId = m[0].id;
        await client.query(`SELECT public.join_match_by_invite_as($1,
          (SELECT invite_code FROM public.pvp_matches WHERE id=$2))`, [bId, matchId]);

        await client.query(`SELECT public.submit_round_result_as($1,$2,1,90,50,0,'PT30S',NULL)`, [aId, matchId]);
        await client.query(`SELECT public.submit_round_result_as($1,$2,1,70,50,0,'PT30S',NULL)`, [bId, matchId]);
        await client.query(`SELECT public.forfeit_match_as($1,$2)`, [bId, matchId]);

        const { rows } = await client.query<{ status: string; winner_id: string; forfeited_by: string }>(
          `SELECT status,winner_id,forfeited_by FROM public.pvp_matches WHERE id=$1`, [matchId]);
        expect(rows[0].status).toBe("completed");
        expect(rows[0].winner_id).toBe(aId);
        expect(rows[0].forfeited_by).toBe(bId);
      } finally {
        await client.end();
      }
    });
  });

  // (e) Cancel — allowed when no submissions
  test.describe("cancel — no submissions", () => {
    const email = uniqueEmail("e2e-pvp4-cancel");
    const password = uniquePassword();
    let userId: string;
    test.beforeAll(async () => { userId = (await createTestUser(email, password)).id; });
    test.afterAll(async () => { if (userId) await deleteTestUser(userId); });

    test("creator cancels via UI", async ({ page }) => {
      const client = new Client({ connectionString: DB_URL });
      await client.connect();
      let matchId: string;
      try {
        const { rows } = await client.query<{ id: string }>(`
          SELECT id FROM public.create_match_as($1,'qwerty','novice','english',false,false,false,
            3, '[["a"],["b"],["c"]]'::jsonb, NULL)`, [userId]);
        matchId = rows[0].id;

        await page.goto("/");
        await signInUI(page, email, password);
        await page.goto(`/pvp/match?id=${matchId}`);
        await page.getByTestId("pvp-cancel-match").click();
        await expect.poll(async () => {
          const r = await client.query<{ status: string }>(`SELECT status FROM public.pvp_matches WHERE id=$1`, [matchId]);
          return r.rows[0]?.status ?? null;
        }, { timeout: 10_000 }).toBe("cancelled");
      } finally {
        await client.end();
      }
    });
  });

  // (f) Cancel — rejected after a submission exists
  test.describe("cancel — rejected after submission", () => {
    const aEmail = uniqueEmail("e2e-pvp4-canrej-a");
    const bEmail = uniqueEmail("e2e-pvp4-canrej-b");
    const aPassword = uniquePassword();
    const bPassword = uniquePassword();
    let aId: string, bId: string;
    test.beforeAll(async () => {
      aId = (await createTestUser(aEmail, aPassword)).id;
      bId = (await createTestUser(bEmail, bPassword)).id;
    });
    test.afterAll(async () => {
      if (aId) await deleteTestUser(aId);
      if (bId) await deleteTestUser(bId);
    });

    test("DB call rejects cancel after a round has any submission", async () => {
      const client = new Client({ connectionString: DB_URL });
      await client.connect();
      try {
        const { rows: m } = await client.query<{ id: string }>(`
          SELECT id FROM public.create_match_as($1,'qwerty','novice','english',false,false,false,
            3, '[["a"],["b"],["c"]]'::jsonb, NULL)`, [aId]);
        const matchId = m[0].id;
        await client.query(`SELECT public.join_match_by_invite_as($1,
          (SELECT invite_code FROM public.pvp_matches WHERE id=$2))`, [bId, matchId]);
        await client.query(`SELECT public.submit_round_result_as($1,$2,1,80,50,0,'PT30S',NULL)`, [aId, matchId]);
        let threw = false;
        try {
          await client.query(`SELECT public.cancel_match_as($1,$2)`, [aId, matchId]);
        } catch { threw = true; }
        expect(threw).toBe(true);
      } finally {
        await client.end();
      }
    });
  });

  // (g) Per-player ordering enforced server-side
  test.describe("per-player ordering enforcement", () => {
    const aEmail = uniqueEmail("e2e-pvp4-ord-a");
    const bEmail = uniqueEmail("e2e-pvp4-ord-b");
    const aPassword = uniquePassword();
    const bPassword = uniquePassword();
    let aId: string, bId: string;
    test.beforeAll(async () => {
      aId = (await createTestUser(aEmail, aPassword)).id;
      bId = (await createTestUser(bEmail, bPassword)).id;
    });
    test.afterAll(async () => {
      if (aId) await deleteTestUser(aId);
      if (bId) await deleteTestUser(bId);
    });

    test("submit_round_result rejects round 2 before round 1", async () => {
      const client = new Client({ connectionString: DB_URL });
      await client.connect();
      try {
        const { rows: m } = await client.query<{ id: string }>(`
          SELECT id FROM public.create_match_as($1,'qwerty','novice','english',false,false,false,
            3, '[["a"],["b"],["c"]]'::jsonb, NULL)`, [aId]);
        const matchId = m[0].id;
        await client.query(`SELECT public.join_match_by_invite_as($1,
          (SELECT invite_code FROM public.pvp_matches WHERE id=$2))`, [bId, matchId]);
        let threw = false;
        try {
          await client.query(`SELECT public.submit_round_result_as($1,$2,2,80,50,0,'PT30S',NULL)`, [aId, matchId]);
        } catch { threw = true; }
        expect(threw).toBe(true);
      } finally {
        await client.end();
      }
    });
  });

  // (h) Rematch from rivals tab
  test.describe("rematch from rivals", () => {
    const aEmail = uniqueEmail("e2e-pvp4-rem-a");
    const bEmail = uniqueEmail("e2e-pvp4-rem-b");
    const aPassword = uniquePassword();
    const bPassword = uniquePassword();
    let aId: string, bId: string;
    test.beforeAll(async () => {
      aId = (await createTestUser(aEmail, aPassword)).id;
      bId = (await createTestUser(bEmail, bPassword)).id;
    });
    test.afterAll(async () => {
      if (aId) await deleteTestUser(aId);
      if (bId) await deleteTestUser(bId);
    });

    test("after a completed match, A's Rivals tab shows B with 1-0 and Rematch", async ({ page }) => {
      const client = new Client({ connectionString: DB_URL });
      await client.connect();
      try {
        const { rows: m } = await client.query<{ id: string }>(`
          SELECT id FROM public.create_match_as($1,'qwerty','novice','english',false,false,false,
            1, '[["a"]]'::jsonb, NULL)`, [aId]);
        const matchId = m[0].id;
        await client.query(`SELECT public.join_match_by_invite_as($1,
          (SELECT invite_code FROM public.pvp_matches WHERE id=$2))`, [bId, matchId]);
        await client.query(`SELECT public.submit_round_result_as($1,$2,1,90,50,0,'PT30S',NULL)`, [aId, matchId]);
        await client.query(`SELECT public.submit_round_result_as($1,$2,1,70,50,0,'PT30S',NULL)`, [bId, matchId]);

        await page.goto("/");
        await signInUI(page, aEmail, aPassword);
        await page.goto("/pvp?tab=rivals");
        await expect(page.getByTestId("pvp-rival-row")).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText(/1\s*–\s*0/)).toBeVisible();
        await expect(page.getByTestId("pvp-rematch")).toBeVisible();
      } finally {
        await client.end();
      }
    });
  });

  // (i) Already-joined invite
  test.describe("already-joined invite", () => {
    const aEmail = uniqueEmail("e2e-pvp4-aj-a");
    const bEmail = uniqueEmail("e2e-pvp4-aj-b");
    const cEmail = uniqueEmail("e2e-pvp4-aj-c");
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

    test("third user opening a fully-joined invite sees closed state", async ({ page }) => {
      const client = new Client({ connectionString: DB_URL });
      await client.connect();
      try {
        const { rows: m } = await client.query<{ id: string; invite_code: string }>(`
          SELECT id, invite_code FROM public.create_match_as($1,'qwerty','novice','english',false,false,false,
            1, '[["a"]]'::jsonb, NULL)`, [aId]);
        const inviteCode = m[0].invite_code;
        await client.query(`SELECT public.join_match_by_invite_as($1,$2)`, [bId, inviteCode]);

        await page.goto("/");
        await signInUI(page, cEmail, cPassword);
        await page.goto(`/pvp/invite?code=${inviteCode}`);
        await expect(page.getByText(/someone else has already joined/i)).toBeVisible({ timeout: 10_000 });
      } finally {
        await client.end();
      }
    });
  });
});
