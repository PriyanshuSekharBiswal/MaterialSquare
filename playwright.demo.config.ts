import { defineConfig, devices } from "@playwright/test";
if (!process.env.TEST_DATABASE_URL)
  throw Error(
    "Set TEST_DATABASE_URL to the isolated test database before running demo browser checks",
  );
export default defineConfig({
  testDir: "./tests/demo",
  outputDir: "./demo-test-results",
  workers: 1,
  timeout: 60000,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:4175",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node scripts/seed-demo.cjs && node apps/api/dist/main.js",
      url: "http://127.0.0.1:4010/api/health/ready",
      reuseExistingServer: false,
      env: {
        DATABASE_URL: process.env.TEST_DATABASE_URL,
        JWT_SECRET: "browser-demo-test-secret-at-least-32-characters",
        APP_ENV: "demo",
        DEMO_AUTH_ENABLED: "true",
        DEMO_CUSTOMER_PHONES: "8888000001,8888000002",
        DEMO_STAFF_PHONE: "8888000000",
        DEMO_STAFF_PASSWORD: "BrowserDemo@2026",
        PORT: "4010",
        NODE_ENV: "development",
        CORS_ORIGINS: "http://127.0.0.1:4175,http://127.0.0.1:4176",
        REDIS_URL: "",
        NOTIFICATION_WEBHOOK_URL: "",
        OTP_WEBHOOK_URL: "",
      },
    },
    {
      command:
        "npm run dev --workspace=@material-square/web -- --host 127.0.0.1 --port 4175 --strictPort",
      url: "http://127.0.0.1:4175",
      reuseExistingServer: false,
      env: { API_PROXY_TARGET: "http://127.0.0.1:4010" },
    },
    {
      command:
        "npm run dev --workspace=@material-square/admin -- --host 127.0.0.1 --port 4176 --strictPort",
      url: "http://127.0.0.1:4176",
      reuseExistingServer: false,
      env: { API_PROXY_TARGET: "http://127.0.0.1:4010" },
    },
  ],
});
