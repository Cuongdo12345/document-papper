import { test, expect } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import type { Result } from "axe-core";

/**
 * FE-17 (docs/frontend/UI_DESIGN_SYSTEM.md Mục 6, 2026-09-19) — kiểm tra
 * WCAG 2.1 A/AA tự động (bao gồm `color-contrast`) cho 4 màn hình đại diện:
 * Dashboard, 1 trang DataTable (Người dùng), 1 Modal (Đặt lại mật khẩu), 1
 * Drawer (Tạo user). `UsersListPage` được chọn làm trang DataTable đại diện
 * vì cùng lúc chứa cả AppModal (`ResetPasswordModal`) và AppDrawer
 * (`UserFormDrawer`) — không cần thêm trang thứ 2/3 riêng cho Modal/Drawer.
 *
 * PHẠM VI TASK NÀY LÀ HẠ TẦNG TEST — nếu axe báo violation thật, test này
 * PHẢI fail và báo cáo lại, KHÔNG được nới lỏng assertion để né lỗi (CLAUDE.md
 * Mục 28).
 */
const WCAG_TAGS = ["wcag2a", "wcag2aa"];

function formatViolations(violations: Result[]): string {
  if (violations.length === 0) return "";
  return violations
    .map((v) => `- [${v.impact ?? "unknown"}] ${v.id}: ${v.help} (${v.nodes.length} phần tử) — ${v.helpUrl}`)
    .join("\n");
}

async function scan(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(results.violations, formatViolations(results.violations)).toEqual([]);
}

test.describe("FE-17 — WCAG AA accessibility scan", () => {
  test("Dashboard", async ({ page }) => {
    await page.goto("/app");
    await expect(page.getByRole("heading", { name: "Tổng quan hệ thống" })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await scan(page);
  });

  test("DataTable — Người dùng", async ({ page }) => {
    await page.goto("/app/users");
    await expect(page.getByRole("heading", { name: "Người dùng" })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await scan(page);
  });

  test("Modal — Đặt lại mật khẩu", async ({ page }) => {
    await page.goto("/app/users");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Đặt lại mật khẩu" }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await scan(page);
  });

  test("Drawer — Tạo user", async ({ page }) => {
    await page.goto("/app/users");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Tạo mới" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await scan(page);
  });
});
