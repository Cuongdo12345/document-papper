import { defineConfig, devices } from "@playwright/test";
// nodenext (tsconfig.node.json) buộc phần mở rộng tường minh cho relative
// import — trỏ ".js" (đúng convention TS/nodenext) dù source thật là ".ts".
import { AUTH_STATE_PATH } from "./e2e/global-setup.js";

/**
 * FE-17 (docs/frontend/UI_DESIGN_SYSTEM.md Mục 6, 2026-09-19) — hạ tầng test
 * WCAG AA contrast (axe-core) + visual regression snapshot (Playwright) cho
 * Dashboard/1 trang DataTable đại diện (Người dùng)/1 Modal/1 Drawer.
 *
 * CHỈ hạ tầng test — KHÔNG đổi giao diện/CSS trang nào (xem `e2e/*.spec.ts`).
 *
 * Dùng port RIÊNG (4100 backend / 4173 frontend), KHÁC port dev mặc định
 * (3000/5173) — tránh xung đột khi dev server thật đang chạy song song lúc
 * dev/test cục bộ. Backend spawn bởi `webServer[0]` tự khởi động MongoDB
 * in-memory RIÊNG (KHÔNG đụng DB dev thật) + seed RBAC/1 user ADMIN cố định
 * — xem `backend/src/__tests__/e2e/startPlaywrightServer.ts`.
 */
const BACKEND_PORT = Number(process.env.PW_BACKEND_PORT ?? 4100);
const FRONTEND_PORT = Number(process.env.PW_FRONTEND_PORT ?? 4173);
const BASE_URL = `http://localhost:${FRONTEND_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: ["**/*.spec.ts"],
  // Dùng CHUNG 1 backend/DB in-memory qua toàn bộ test — chạy song song
  // nhiều worker có thể chồng lấn state (vd 2 test cùng mở Modal/Drawer trên
  // cùng 1 trang Users) — quy mô hiện tại (4 màn) không cần song song hoá.
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
  },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: BASE_URL,
    storageState: AUTH_STATE_PATH,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "npm run test:e2e:server",
      cwd: "../backend",
      port: BACKEND_PORT,
      reuseExistingServer: !process.env.CI,
      // Lần chạy ĐẦU TIÊN có thể chậm — `mongodb-memory-server` tự tải
      // binary MongoDB nếu máy chưa có sẵn (xem comment `MONGOMS_VERSION`
      // trong `setup.ts`).
      timeout: 180_000,
      env: { PW_BACKEND_PORT: String(BACKEND_PORT), PW_FRONTEND_PORT: String(FRONTEND_PORT) },
    },
    {
      command: `npm run dev -- --port ${FRONTEND_PORT} --strictPort`,
      cwd: ".",
      port: FRONTEND_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      // Override `.env.development` (trỏ mặc định :3000) — PHẢI khớp
      // `PW_BACKEND_PORT` ở trên.
      env: { VITE_API_BASE_URL: `http://localhost:${BACKEND_PORT}/api` },
    },
  ],
});
