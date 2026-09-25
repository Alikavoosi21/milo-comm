import { defineConfig, devices } from "@playwright/test";
import { tmpdir } from "node:os";
import path from "node:path";

const e2eDataDir = path.join(tmpdir(), `milo-e2e-${process.pid}-${Date.now()}`);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://localhost:3107", trace: "retain-on-failure" },
  webServer: {
    command: "npm run start -- --port 3107",
    url: "http://localhost:3107",
    reuseExistingServer: false,
    env: { MOCK_AI: "true", ADMIN_PASSWORD: "test-admin-password", ADMIN_SESSION_SECRET: "test-session-secret-at-least-16-chars", MEMORY_ACTIVE_TOKEN_LIMIT: "256", MEMORY_RECENT_MESSAGES: "2", MILO_DATA_DIR: e2eDataDir, STORAGE_DIR: path.join(e2eDataDir, "uploads") },
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
  ],
});




