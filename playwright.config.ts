import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command:
        "npm run dev --workspace=@material-square/web -- --host 127.0.0.1 --port 4173 --strictPort",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: false,
      env: {
        VITE_MSG91_WIDGET_ID: "browser-test-widget",
        VITE_MSG91_TOKEN_AUTH: "browser-test-token",
        VITE_ADMIN_APP_ORIGIN: "http://127.0.0.1:4174",
      },
    },
    {
      command:
        "npm run dev --workspace=@material-square/admin -- --host 127.0.0.1 --port 4174 --strictPort",
      url: "http://127.0.0.1:4174",
      reuseExistingServer: false,
      env: {
        VITE_CUSTOMER_APP_URL: "http://127.0.0.1:4173",
      },
    },
  ],
});
