import { test, expect } from "@playwright/test";

/**
 * DEV-112 (tách module Tài sản, GĐ 1) + FE-42 (GĐ 7) — form danh mục trên trình duyệt thật, backend thật
 * (in-memory, xem `playwright.config.ts`):
 *   - trong module "Thiết bị CNTT" loại tài sản CỐ ĐỊNH theo module: không còn ô chọn loại, danh mục gốc tạo được
 *     ngay và thuộc nhánh CNTT;
 *   - chọn danh mục cha thì danh mục con kế thừa (không có ô loại);
 *   - tạo gốc + con thành công.
 */
test.describe("Danh mục tài sản theo module (DEV-112 / FE-42)", () => {
  test("module CNTT: không có ô chọn loại; tạo gốc + con thành công", async ({ page }) => {
    const suffix = Date.now().toString().slice(-6);
    const rootCode = `PW-ROOT-${suffix}`;
    const childCode = `PW-CHILD-${suffix}`;

    await page.goto("/app/it-assets/categories");
    await expect(page.getByRole("heading", { name: "Danh mục tài sản" })).toBeVisible();

    // 1) Danh mục gốc: KHÔNG có ô "Loại tài sản" (loại cố định theo module), có ghi chú nhánh.
    await page.getByRole("button", { name: "Thêm danh mục" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Loại tài sản")).toHaveCount(0);
    await expect(dialog.getByText("thuộc nhánh Thiết bị CNTT")).toBeVisible();
    await dialog.getByLabel("Mã danh mục").fill(rootCode);
    await dialog.getByLabel("Tên danh mục").fill("Gốc thử Playwright");
    await dialog.getByRole("button", { name: "Tạo mới" }).click();
    await expect(page.getByText("Đã tạo danh mục tài sản mới")).toBeVisible();
    await expect(dialog).toBeHidden();

    // 2) Danh mục con: chọn cha, tạo được.
    await page.getByRole("button", { name: "Thêm danh mục" }).click();
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Mã danh mục").fill(childCode);
    await dialog.getByLabel("Tên danh mục").fill("Con thử Playwright");
    await dialog.getByLabel("Danh mục cha (tuỳ chọn)").selectOption({ label: `Gốc thử Playwright (${rootCode})` });
    await expect(dialog.getByText("thuộc nhánh Thiết bị CNTT")).toHaveCount(0);
    await dialog.getByRole("button", { name: "Tạo mới" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(childCode)).toBeVisible();
  });

  test("hai module có danh mục riêng: danh mục tạo ở CNTT không xuất hiện ở Thiết bị y tế", async ({ page }) => {
    const suffix = Date.now().toString().slice(-6);
    const code = `PW-ONLYIT-${suffix}`;

    await page.goto("/app/it-assets/categories");
    await page.getByRole("button", { name: "Thêm danh mục" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Mã danh mục").fill(code);
    await dialog.getByLabel("Tên danh mục").fill("Chỉ CNTT");
    await dialog.getByRole("button", { name: "Tạo mới" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(code)).toBeVisible();

    await page.goto("/app/medical-assets/categories");
    await expect(page.getByRole("heading", { name: "Danh mục tài sản" })).toBeVisible();
    await expect(page.getByText(code)).toHaveCount(0);
  });
});
