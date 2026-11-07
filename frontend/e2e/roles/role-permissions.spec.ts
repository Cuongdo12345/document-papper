import { test, expect, type Page } from "@playwright/test";
import { ROLE_KEYS, readRolesData, roleAuthPath, type RoleKey, type RolesData } from "./roles.shared.js";

/**
 * FE-46 — Playwright theo role cho module Thiết bị CNTT / Thiết bị y tế / Bản quyền phần mềm: đăng nhập bằng giao diện thật
 * với 3 role không phải ADMIN và kiểm GIAO DIỆN theo quyền: mục sidebar, chặn vào URL trực tiếp (→ /403) và nút thao tác ẩn/hiện.
 * (Ma trận quyền ở tầng API đã kiểm bởi e2e backend `asset-split-permissions`; ở đây kiểm frontend phản ánh đúng.)
 *
 * BẢNG KỲ VỌNG dưới đây viết TAY từ `docs/development/ASSET_MODULE_SPLIT_PLAN.md` mục 4.4 + 2 quyết định của user
 * (IT được cấp đủ quyền module CNTT, IT được thanh lý) — KHÔNG import từ code frontend để bắt lỗi ánh xạ quyền ↔ giao diện.
 * Backend vẫn là ranh giới bảo mật thật; phần này chỉ kiểm lớp UX (CLAUDE.md §18, PermissionGuard).
 */
type Cap = "create" | "update" | "delete" | "assign" | "inventoryCheck" | "planView" | "categoryCreate" | "categoryDelete";
type Caps = Record<Cap, boolean>;

const NONE: Caps = { create: false, update: false, delete: false, assign: false, inventoryCheck: false, planView: false, categoryCreate: false, categoryDelete: false };
const FULL: Caps = { create: true, update: true, delete: true, assign: true, inventoryCheck: true, planView: true, categoryCreate: true, categoryDelete: true };

type ModuleKey = "IT" | "MEDICAL";
const MODULES: Record<ModuleKey, { base: string; label: string }> = {
  IT: { base: "/app/it-assets", label: "Thiết bị CNTT" },
  MEDICAL: { base: "/app/medical-assets", label: "Thiết bị y tế" },
};

const EXPECTED: Record<RoleKey, { IT: Caps; MEDICAL: Caps; softwareLicenses: boolean }> = {
  // IT: đủ quyền module CNTT + bản quyền phần mềm; chỉ XEM module y tế.
  IT: { IT: FULL, MEDICAL: NONE, softwareLicenses: true },
  // Phòng Vật tư-TTB: đủ quyền module y tế; chỉ XEM module CNTT; không có bản quyền phần mềm.
  PHONG_VAT_TU_TTB: { IT: NONE, MEDICAL: FULL, softwareLicenses: false },
  // USER: xem + kiểm kê cả hai module; không sửa gì, không có bản quyền phần mềm.
  USER: { IT: { ...NONE, inventoryCheck: true }, MEDICAL: { ...NONE, inventoryCheck: true }, softwareLicenses: false },
};

/** Mở route rồi chờ trang dựng xong (h1 hiện) — tránh khẳng định sớm trong lúc ProtectedRoute còn đang tải quyền. */
async function open(page: Page, url: string) {
  await page.goto(url);
  const h1 = page.locator("h1").first();
  await expect(h1).toBeVisible();
  return h1;
}

async function expectRoute(page: Page, url: string, allowed: boolean) {
  const h1 = await open(page, url);
  if (allowed) {
    await expect(h1).not.toContainText("403");
    await expect(page).toHaveURL(new RegExp(`${url}$`));
  } else {
    await expect(page).toHaveURL(/\/403$/);
    await expect(h1).toContainText("403");
  }
}

const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const visible = (allowed: boolean) => (allowed ? "hiện" : "ẩn");

let data: RolesData;
test.beforeAll(() => {
  data = readRolesData();
});

for (const role of ROLE_KEYS) {
  test.describe(`Role ${role}`, () => {
    test.use({ storageState: roleAuthPath(role) });
    const expected = EXPECTED[role];

    test("sidebar chỉ hiện các mục tài sản đúng quyền xem", async ({ page }) => {
      await page.goto("/app");
      const nav = page.getByRole("navigation");
      await expect(nav.getByRole("link", { name: "Thiết bị CNTT" })).toBeVisible();
      await expect(nav.getByRole("link", { name: "Thiết bị y tế" })).toBeVisible();
      await expect(nav.getByRole("link", { name: "Bản quyền phần mềm" })).toHaveCount(expected.softwareLicenses ? 1 : 0);
    });

    test(`/app/software-licenses ${expected.softwareLicenses ? "vào được" : "bị chặn → /403"}`, async ({ page }) => {
      await expectRoute(page, "/app/software-licenses", expected.softwareLicenses);
    });

    if (expected.softwareLicenses) {
      test("bản quyền phần mềm: nút Thêm bản quyền hiện", async ({ page }) => {
        await open(page, "/app/software-licenses");
        await expect(button(page, "Thêm bản quyền")).toBeVisible();
      });
    }

    for (const moduleKey of ["IT", "MEDICAL"] as const) {
      const { base, label } = MODULES[moduleKey];
      const caps = expected[moduleKey];
      const assetId = () => (moduleKey === "IT" ? data.itAssetId : data.medAssetId);
      const assetName = () => (moduleKey === "IT" ? data.itAssetName : data.medAssetName);

      test.describe(label, () => {
        test("danh sách vào được và thấy thiết bị của module", async ({ page }) => {
          const h1 = await open(page, base);
          await expect(h1).toContainText(label);
          await expect(page.getByText(assetName())).toBeVisible();
        });

        test(`route /create ${caps.create ? "vào được" : "bị chặn → /403"}`, async ({ page }) => {
          await expectRoute(page, `${base}/create`, caps.create);
        });

        test(`route /scan (kiểm kê) ${caps.inventoryCheck ? "vào được" : "bị chặn → /403"}`, async ({ page }) => {
          await expectRoute(page, `${base}/scan`, caps.inventoryCheck);
        });

        test(`route /maintenance-calendar ${caps.planView ? "vào được" : "bị chặn → /403"}`, async ({ page }) => {
          await expectRoute(page, `${base}/maintenance-calendar`, caps.planView);
        });

        test("route /categories (xem danh mục) vào được với cả 3 role", async ({ page }) => {
          await expectRoute(page, `${base}/categories`, true);
        });

        test("nút trên trang danh sách theo quyền", async ({ page }) => {
          await open(page, base);
          await expect(page.getByText(assetName())).toBeVisible();
          await expect(button(page, "Thêm tài sản"), `Thêm tài sản phải ${visible(caps.create)}`).toHaveCount(caps.create ? 1 : 0);
          await expect(button(page, "Quét mã kiểm kê"), `Quét mã kiểm kê phải ${visible(caps.inventoryCheck)}`).toHaveCount(caps.inventoryCheck ? 1 : 0);
          await expect(button(page, "Lịch bảo trì"), `Lịch bảo trì phải ${visible(caps.planView)}`).toHaveCount(caps.planView ? 1 : 0);
          const row = page.getByRole("row", { name: new RegExp(assetName()) });
          await expect(row.getByRole("button", { name: "Xem chi tiết" })).toBeVisible(); // quyền xem: role nào cũng có
          await expect(row.getByRole("button", { name: "Sửa", exact: true })).toHaveCount(caps.update ? 1 : 0);
          await expect(row.getByRole("button", { name: "Xoá", exact: true })).toHaveCount(caps.delete ? 1 : 0);
        });

        test("trang chi tiết: xem được; nút Sửa/Xoá/Cấp phát theo quyền", async ({ page }) => {
          const h1 = await open(page, `${base}/${assetId()}`);
          await expect(h1).toContainText(assetName());
          await expect(button(page, "Sửa"), `Sửa phải ${visible(caps.update)}`).toHaveCount(caps.update ? 1 : 0);
          await expect(button(page, "Xoá"), `Xoá phải ${visible(caps.delete)}`).toHaveCount(caps.delete ? 1 : 0);
          await expect(page.getByRole("heading", { name: "Cấp phát / Luân chuyển" })).toHaveCount(caps.assign ? 1 : 0);
          if (moduleKey === "IT") {
            // Hồ sơ CNTT: chưa có hồ sơ → chỉ role được sửa thiết bị CNTT thấy nút tạo.
            await expect(page.getByRole("heading", { name: "Hồ sơ thiết bị CNTT" })).toBeVisible();
            await expect(button(page, "Tạo hồ sơ CNTT")).toHaveCount(caps.update ? 1 : 0);
          }
        });

        test("trang danh mục: nút Thêm danh mục / Xoá theo quyền", async ({ page }) => {
          const h1 = await open(page, `${base}/categories`);
          await expect(h1).toContainText("Danh mục tài sản");
          await expect(button(page, "Thêm danh mục"), `Thêm danh mục phải ${visible(caps.categoryCreate)}`).toHaveCount(caps.categoryCreate ? 1 : 0);
          const row = page.getByRole("row", { name: new RegExp(`Lá PR ${moduleKey === "IT" ? "I" : "M"} `) });
          await expect(row).toBeVisible();
          await expect(row.getByRole("button", { name: "Xoá", exact: true })).toHaveCount(caps.categoryDelete ? 1 : 0);
        });
      });
    }

    test("đường dẫn cũ /app/assets chuyển sang module CNTT (mọi role đều xem được)", async ({ page }) => {
      await page.goto("/app/assets");
      await expect(page).toHaveURL(/\/app\/it-assets$/);
      await expect(page.locator("h1").first()).toContainText("Thiết bị CNTT");
    });
  });
}
