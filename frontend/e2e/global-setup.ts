import path from "node:path";
import { chromium, type FullConfig } from "@playwright/test";

// `frontend/package.json` có `"type":"module"` → file này chạy dưới ESM,
// KHÔNG có `__dirname` sẵn như CommonJS — `import.meta.dirname` (Node
// >=20.11) là cách thay thế chuẩn, KHÔNG cần thêm `fileURLToPath`.

/**
 * FE-17 (docs/frontend/UI_DESIGN_SYSTEM.md Mục 6, 2026-09-19) — đăng nhập 1
 * LẦN qua UI THẬT (form + API round-trip, không mock) ở `globalSetup`, lưu
 * lại `storageState` (chứa `refreshToken` trong localStorage — xem
 * `frontend/src/utils/tokenStorage.ts`) để MỌI spec file trong
 * `e2e/*.spec.ts` tái sử dụng qua `playwright.config.ts::use.storageState` —
 * tránh lặp lại luồng login ở từng test (pattern chuẩn của Playwright).
 *
 * Khi mở trang mới với `storageState` này, `useAuthBootstrap.ts` tự đổi
 * `refreshToken` → `accessToken` mới ngay khi app khởi động (y hệt hành vi
 * người dùng thật mở lại trình duyệt) — KHÔNG cần can thiệp gì thêm.
 *
 * Tài khoản/mật khẩu PHẢI khớp CHÍNH XÁC với `PLAYWRIGHT_ADMIN_USERNAME`/
 * `PLAYWRIGHT_ADMIN_PASSWORD` ở
 * `backend/src/__tests__/e2e/startPlaywrightServer.ts` — không import chung
 * được qua ranh giới package frontend/backend nên duplicate CÓ CHỦ ĐÍCH, đổi
 * 1 bên PHẢI đổi bên còn lại.
 */
const ADMIN_USERNAME = "pw_admin_e2e";
const ADMIN_PASSWORD = "Password123!";

export const AUTH_STATE_PATH = path.join(import.meta.dirname, ".auth", "admin.json");

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use?.baseURL as string;
  if (!baseURL) throw new Error("[FE-17] Thiếu baseURL trong playwright.config.ts");

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(`${baseURL}/login`);
  await page.getByLabel("Tên đăng nhập").fill(ADMIN_USERNAME);
  // `exact:true` — "Mật khẩu" khớp fuzzy CẢ nút "Hiện mật khẩu" (toggle
  // show/hide) kế bên, không chỉ riêng ô input.
  await page.getByLabel("Mật khẩu", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL(`${baseURL}/app`);

  await page.context().storageState({ path: AUTH_STATE_PATH });
  await browser.close();
}
