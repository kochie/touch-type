import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config for the renderer in browser mode.
 *
 * Boots `next dev renderer` against a local Supabase stack and runs each spec
 * in chromium with timezone pinned so streak math is deterministic.
 *
 * Required env (provided by the workflow or `renderer/.env.local` locally):
 *   E2E_BASE_URL              default http://localhost:8000
 *   E2E_SUPABASE_URL          default http://127.0.0.1:54321
 *   E2E_SUPABASE_ANON_KEY     local supabase anon key
 *   E2E_SUPABASE_SERVICE_KEY  local supabase service_role key
 *   E2E_DB_URL                postgres connection string for assertions
 */
export default defineConfig({
  testDir: ".",
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: false, // tests share the same Supabase DB
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:4321",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    timezoneId: "Australia/Melbourne",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.E2E_NO_WEB_SERVER
    ? undefined
    : {
        // Pinned to 4321 to avoid colliding with whatever else is running on
        // 3000/8000 in dev. Override via E2E_BASE_URL + E2E_NO_WEB_SERVER if
        // you've already started a dev server on a different port.
        command: "pnpm exec next dev renderer/ -p 4321",
        url: process.env.E2E_BASE_URL ?? "http://localhost:4321",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        cwd: "..",
      },
});
