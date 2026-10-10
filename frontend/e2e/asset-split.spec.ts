import { test, expect, type Page } from "@playwright/test";

/**
 * FE-42/43/44 (tách module Tài sản, Giai đoạn 7) — luồng chính trên trình duyệt thật + backend thật (in-memory):
 * sidebar 3 mục mới, tạo thiết bị CNTT với hồ sơ CNTT, bản quyền phần mềm (tạo, gán, hiện ở trang thiết bị),
 * đường dẫn cũ /app/assets chuyển hướng, hai module tách biệt, Dashboard hai tab theo loại.
 * Chạy bằng ADMIN (đủ mọi quyền); ma trận quyền từng role đã kiểm ở e2e backend (asset-split-permissions).
 */
const suffix = Date.now().toString().slice(-6);

async function createRootAndLeafCategory(page: Page, base: "it-assets" | "medical-assets", rootCode: string, leafCode: string, leafName: string) {
  await page.goto(`/app/${base}/categories`);
  await page.getByRole("button", { name: "Thêm danh mục" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Mã danh mục").fill(rootCode);
  await dialog.getByLabel("Tên danh mục").fill(`Gốc ${rootCode}`);
  await dialog.getByRole("button", { name: "Tạo mới" }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "Thêm danh mục" }).click();
  await dialog.getByLabel("Mã danh mục").fill(leafCode);
  await dialog.getByLabel("Tên danh mục").fill(leafName);
  await dialog.getByLabel("Danh mục cha (tuỳ chọn)").selectOption({ label: `Gốc ${rootCode} (${rootCode})` });
  await dialog.getByRole("button", { name: "Tạo mới" }).click();
  await expect(dialog).toBeHidden();
}

async function createAsset(page: Page, base: "it-assets" | "medical-assets", categoryLabel: string, name: string): Promise<string> {
  await page.goto(`/app/${base}/create`);
  await page.getByLabel("Tên tài sản").fill(name);
  await page.getByLabel("Danh mục").selectOption({ label: categoryLabel });
  await page.getByLabel("Khoa/Phòng").selectOption({ index: 1 });
  await page.getByRole("button", { name: /Tạo|Lưu|Thêm/ }).last().click();
  await expect(page).toHaveURL(new RegExp(`/app/${base}/[0-9a-f]{24}$`));
  return page.url().split("/").pop()!;
}

test.describe.serial("Tách module Tài sản (FE-42/43/44)", () => {
  let itAssetId = "";
  const itRoot = `PWIT${suffix}`;
  const itLeaf = `PWITL${suffix}`;
  const medRoot = `PWMD${suffix}`;
  const medLeaf = `PWMDL${suffix}`;
  const itName = `Máy PW CNTT ${suffix}`;
  const medName = `Máy PW y tế ${suffix}`;

  test("sidebar có 3 mục mới và không còn mục Tài sản cũ", async ({ page }) => {
    await page.goto("/app");
    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("link", { name: "Thiết bị CNTT" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Thiết bị y tế" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Bản quyền phần mềm" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Tài sản", exact: true })).toHaveCount(0);
  });

  test("tạo thiết bị CNTT và thiết bị y tế ở hai module riêng", async ({ page }) => {
    // Backend Playwright chỉ seed ADMIN, chưa có khoa/phòng — tạo 1 khoa để chọn khi tạo thiết bị.
    await page.goto("/app/departments");
    await page.getByRole("button", { name: "Tạo mới" }).click();
    const deptDialog = page.getByRole("dialog");
    await deptDialog.getByLabel("Tên phòng ban").fill(`Khoa PW ${suffix}`);
    await deptDialog.getByLabel("Mã phòng ban").fill(`KPW${suffix}`);
    await deptDialog.getByRole("button", { name: "Tạo mới" }).click();
    await expect(deptDialog).toBeHidden();

    await createRootAndLeafCategory(page, "it-assets", itRoot, itLeaf, "Máy tính PW");
    await createRootAndLeafCategory(page, "medical-assets", medRoot, medLeaf, "Máy thở PW");

    itAssetId = await createAsset(page, "it-assets", `Máy tính PW (${itLeaf})`, itName);
    await createAsset(page, "medical-assets", `Máy thở PW (${medLeaf})`, medName);

    // Mỗi danh sách chỉ có thiết bị của loại mình.
    await page.goto("/app/it-assets");
    await expect(page.getByText(itName)).toBeVisible();
    await expect(page.getByText(medName)).toHaveCount(0);
    await page.goto("/app/medical-assets");
    await expect(page.getByText(medName)).toBeVisible();
    await expect(page.getByText(itName)).toHaveCount(0);
  });

  test("chi tiết thiết bị CNTT: tạo hồ sơ CNTT; thiết bị y tế không có khối hồ sơ CNTT", async ({ page }) => {
    await page.goto(`/app/it-assets/${itAssetId}`);
    await expect(page.getByRole("heading", { name: "Hồ sơ thiết bị CNTT" })).toBeVisible();
    await page.getByRole("button", { name: "Tạo hồ sơ CNTT" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("CPU").fill("Core i7");
    await dialog.getByLabel("Địa chỉ IP").fill("10.9.8.7");
    await dialog.getByLabel("Địa chỉ MAC").fill("aa-bb-cc-dd-ee-ff");
    await dialog.getByRole("button", { name: "Tạo hồ sơ" }).click();
    await expect(page.getByText("Đã lưu hồ sơ thiết bị CNTT")).toBeVisible();
    await expect(page.getByText("10.9.8.7")).toBeVisible();

    // IP sai định dạng bị chặn ngay ở form.
    await page.getByRole("button", { name: "Sửa hồ sơ" }).click();
    await dialog.getByLabel("Địa chỉ IP").fill("999.1.1.1");
    await dialog.getByRole("button", { name: "Lưu thay đổi" }).click();
    await expect(dialog.getByText("Địa chỉ IP không hợp lệ")).toBeVisible();
    await dialog.getByRole("button", { name: "Huỷ" }).click();
  });

  test("bản quyền phần mềm: tạo, gán cho thiết bị, hiện ở trang thiết bị, gỡ trả lại chỗ", async ({ page }) => {
    const softwareName = `Office PW ${suffix}`;
    await page.goto("/app/software-licenses");
    await page.getByRole("button", { name: "Thêm bản quyền" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Tên phần mềm").fill(softwareName);
    await dialog.getByLabel("Số máy được cài").fill("1");
    await dialog.getByRole("button", { name: "Thêm bản quyền" }).click();
    await expect(page.getByText("Đã thêm bản quyền phần mềm")).toBeVisible();
    await page.getByRole("link", { name: new RegExp(softwareName) }).click();

    // Gán cho thiết bị CNTT vừa tạo (chỉ gợi ý thiết bị CNTT).
    await page.getByPlaceholder("Tìm theo mã/tên tài sản...").fill(suffix);
    await expect(page.getByRole("button", { name: new RegExp(itName) })).toBeVisible();
    await expect(page.getByRole("button", { name: new RegExp(medName) })).toHaveCount(0);
    await page.getByRole("button", { name: new RegExp(itName) }).click();
    await page.getByRole("button", { name: "Gán bản quyền" }).click();
    await expect(page.getByText("Đã gán bản quyền cho thiết bị")).toBeVisible();
    await expect(page.getByText("(hết chỗ)")).toBeVisible(); // 1/1

    // Trang thiết bị hiện bản quyền đang gán.
    await page.goto(`/app/it-assets/${itAssetId}`);
    await expect(page.getByRole("link", { name: new RegExp(softwareName) })).toBeVisible();

    // Gỡ → trả lại chỗ.
    await page.getByRole("button", { name: `Gỡ ${softwareName}` }).click();
    await page.getByRole("dialog").getByRole("button", { name: /Xác nhận|Gỡ/ }).last().click();
    await expect(page.getByText("Đã gỡ bản quyền khỏi thiết bị")).toBeVisible();
  });

  test("đường dẫn cũ /app/assets chuyển hướng sang đúng module", async ({ page }) => {
    await page.goto("/app/assets");
    await expect(page).toHaveURL(/\/app\/it-assets$/);

    await page.goto(`/app/assets/${itAssetId}`);
    await expect(page).toHaveURL(new RegExp(`/app/it-assets/${itAssetId}$`));
    await expect(page.getByRole("heading", { name: itName })).toBeVisible();
  });

  test("tài sản thuộc loại khác module: mở bằng URL module kia -> báo lỗi, không lộ dữ liệu", async ({ page }) => {
    await page.goto(`/app/medical-assets/${itAssetId}`);
    await expect(page.getByRole("heading", { name: itName })).toHaveCount(0);
    await expect(page.getByText(/Không tìm thấy tài sản/)).toBeVisible();
  });

  test("Dashboard có hai tab theo loại, số liệu mỗi tab đúng loại", async ({ page }) => {
    await page.goto("/app?tab=assets");
    await expect(page.getByRole("tab", { name: "Thiết bị CNTT" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Thiết bị y tế" })).toBeVisible();
    await expect(page.getByText(/Tổng thiết bị cntt/i)).toBeVisible();
    await page.getByRole("tab", { name: "Thiết bị y tế" }).click();
    await expect(page.getByText(/Tổng thiết bị y tế/i)).toBeVisible();
  });

  // Dọn dẹp: Dashboard (visual.spec.ts, baseline chụp lúc DB còn trống) đếm số khoa/phòng — xoá khoa đã tạo ở trên
  // để các spec chạy SAU không bị lệch vì dữ liệu của spec này.
  test("dọn dẹp khoa/phòng đã tạo", async ({ page }) => {
    await page.goto("/app/departments");
    const row = page.getByRole("row", { name: new RegExp(`KPW${suffix}`) });
    await row.getByRole("button", { name: "Xoá" }).click();
    await page.getByRole("dialog").getByRole("button", { name: /Xác nhận|Xoá/ }).last().click();
    await expect(row).toHaveCount(0);
  });
});
