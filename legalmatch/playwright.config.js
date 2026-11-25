import { defineConfig, devices } from "@playwright/test";

/**
 * All demo-flow specs mock the backend at the network layer (see
 * tests/e2e/demo-flow.spec.js), so this only needs the Vite dev server -
 * no Express/Postgres required to run it (brief section 4).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    viewport: { width: 390, height: 844 },
    screenshot: "off",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev -- --port 5173",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 30000,
  },
});
