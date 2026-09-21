import { test, expect } from "@playwright/test";

/**
 * FE-17 (docs/frontend/UI_DESIGN_SYSTEM.md Mục 6, 2026-09-19) — visual
 * regression snapshot NHẸ cho 4 màn hình đại diện (xem `a11y.spec.ts` để
 * biết lý do chọn `UsersListPage` làm trang DataTable đại diện).
 *
 * LẦN CHẠY ĐẦU cần tạo baseline: `npx playwright test --update-snapshots`
 * (ảnh baseline lưu ở `e2e/visual.spec.ts-snapshots/`, PHẢI commit vào git —
 * đây chính là "golden" để so sánh các lần chạy sau). Baseline nhạy với
 * OS/font-rendering — nếu CI chạy trên hệ điều hành khác máy tạo baseline,
 * cần tạo lại baseline TRÊN đúng môi trường CI đó (giới hạn đã biết, ghi ở
 * DEV-070/FE-17 task doc, KHÔNG tự ý nới `maxDiffPixelRatio` để né việc này).
 *
 * Cột "Ngày tạo" ở bảng Users bị MASK (che khi so sánh) — giá trị đổi theo
 * ngày chạy test thật (fresh-seed mỗi lần), không phải nội dung cần theo dõi
 * regression.
 */
test.describe("FE-17 — Visual regression snapshot", () => {
  test("Dashboard", async ({ page }) => {
    await page.goto("/app");
    await expect(page.getByRole("heading", { name: "Tổng quan hệ thống" })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("dashboard.png", { fullPage: true });
  });

  test("DataTable — Người dùng", async ({ page }) => {
    await page.goto("/app/users");
    await expect(page.getByRole("heading", { name: "Người dùng" })).toBeVisible();
    await page.waitForLoadState("networkidle");
    const createdAtColumn = page.locator("table tbody td:nth-last-child(1)");
    await expect(page).toHaveScreenshot("users-datatable.png", { fullPage: true, mask: [createdAtColumn] });
  });

  test("Modal — Đặt lại mật khẩu", async ({ page }) => {
    await page.goto("/app/users");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Đặt lại mật khẩu" }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page).toHaveScreenshot("reset-password-modal.png");
  });

  test("Drawer — Tạo user", async ({ page }) => {
    await page.goto("/app/users");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Tạo mới" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page).toHaveScreenshot("create-user-drawer.png");
  });
});
