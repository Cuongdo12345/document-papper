// backend/src/__tests__/e2e/startPlaywrightServer.ts
//
// FE-17 (docs/frontend/UI_DESIGN_SYSTEM.md Mục 6, 2026-09-19) — bootstrap
// backend RIÊNG cho Playwright (a11y scan + visual regression ở
// `frontend/e2e/`), KHÔNG phải file Jest (`*.e2e-test.ts`) — không được
// `jest.e2e.config.js` nhặt vào, chạy TRỰC TIẾP qua `ts-node` (script
// `test:e2e:server` ở `package.json`).
//
// TÁI SỬ DỤNG ĐÚNG hạ tầng E2E đã có (`setup.ts`/`seedTestData.ts`, DEV-048)
// thay vì tự viết lại — cùng in-memory Mongo (KHÔNG đụng DB dev thật), cùng
// cách seed RBAC/User đọc trực tiếp từ `PERMISSIONS`/`ROLE_PERMISSIONS` nên
// luôn khớp RBAC thật đang chạy (CLAUDE.md Mục 11 — Existing Code First).
//
// Khác THẬT SỰ so với các file `*.e2e-test.ts`: KHÔNG chạy trong Jest, KHÔNG
// tự tắt sau khi xong — `app.listen()` giữ tiến trình sống để Playwright
// (`playwright.config.ts::webServer`) tự khởi động/tắt tiến trình này bao
// quanh vòng đời test suite (spawn trước khi chạy test, kill sau khi xong).
import { startE2EDatabase } from "./setup";
import { seedRbac, seedUser } from "./seedTestData";

const PORT = Number(process.env.PW_BACKEND_PORT ?? 4100);
// PHẢI khớp CHÍNH XÁC port frontend do Playwright khởi động
// (`playwright.config.ts::webServer[1]`) — CORS middleware (`app.ts`) chặn
// request đến từ origin khác `CLIENT_URL`.
const FRONTEND_PORT = process.env.PW_FRONTEND_PORT ?? "4173";

// Tài khoản test CỐ ĐỊNH — PHẢI khớp CHÍNH XÁC với hằng số cùng tên ở
// `frontend/e2e/global-setup.ts` (không import chung được qua ranh giới
// package frontend/backend, duplicate CÓ CHỦ ĐÍCH — đổi 1 bên PHẢI đổi bên
// còn lại).
export const PLAYWRIGHT_ADMIN_USERNAME = "pw_admin_e2e";
export const PLAYWRIGHT_ADMIN_PASSWORD = "Password123!";

async function main(): Promise<void> {
  // Ghi TRƯỚC `startE2EDatabase()` — hàm đó dùng `??=` (chỉ set giá trị mặc
  // định 5173 nếu CLIENT_URL chưa tồn tại), ghi ở đây để override đúng port
  // Playwright dùng thay vì port dev mặc định.
  process.env.CLIENT_URL = `http://localhost:${FRONTEND_PORT}`;

  await startE2EDatabase();
  const roleIds = await seedRbac();
  await seedUser({
    username: PLAYWRIGHT_ADMIN_USERNAME,
    password: PLAYWRIGHT_ADMIN_PASSWORD,
    fullName: "Playwright Admin (FE-17 E2E)",
    roleId: roleIds.ADMIN,
  });

  const app = (await import("../../app")).default;
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console -- log khởi động, không phải debug code sót lại.
    console.log(`[FE-17][playwright-backend] Sẵn sàng tại http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("[FE-17][playwright-backend] Khởi động thất bại:", err);
  process.exit(1);
});
