import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright runs every test against the PRODUCTION build, not the dev server.
 *
 * `webServer` starts `next start` (which serves the output of `npm run build`)
 * on a fixed local port before the tests and stops it afterwards. So the usual
 * order is:
 *
 *   npm run build   # create .next/ (the artifact under test)
 *   npm test        # start that artifact and test it
 *
 * If no build exists, `next start` exits with "Could not find a production
 * build", and the run fails instead of silently testing something else.
 *
 * `reuseExistingServer: false` matters for the same reason: if a dev server
 * happened to be running on this port, Playwright would refuse to start
 * rather than quietly test the dev server.
 */
const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  // Fail if a `test.only` is accidentally left in the code on CI.
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    // Keep a trace only for failures, to debug them without slowing green runs.
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run start -- --hostname 127.0.0.1 --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
