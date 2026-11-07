import { test as setup, expect } from "@playwright/test";
import {
  ADMIN_PASSWORD,
  ADMIN_USERNAME,
  API,
  ROLE_KEYS,
  ROLE_PASSWORD,
  apiCall,
  apiLogin,
  roleAuthPath,
  writeRolesData,
  type RoleKey,
  type RolesData,
} from "./roles.shared.js";

/**
 * Playwright theo role (FE-46) — chuẩn bị: bằng ADMIN qua API tạo 1 khoa, danh mục + thiết bị CNTT, danh mục + thiết bị y tế
 * và 3 tài khoản (role IT, PHONG_VAT_TU_TTB, USER); rồi ĐĂNG NHẬP BẰNG GIAO DIỆN THẬT từng tài khoản và lưu phiên
 * (`role-<ROLE>.json`) cho spec dùng lại. Dữ liệu được dọn ở `roles.teardown.ts`.
 */
setup("tạo dữ liệu + tài khoản theo role và lưu phiên đăng nhập", async ({ request, browser, baseURL }) => {
  const suffix = Date.now().toString().slice(-6);
  const token = await apiLogin(request, ADMIN_USERNAME, ADMIN_PASSWORD);

  // Role id lấy từ API thật (không giả định thứ tự).
  const rolesRes = await request.get(`${API}/rbac/roles?limit=100`, { headers: { Authorization: `Bearer ${token}` } });
  expect(rolesRes.ok(), "GET /rbac/roles").toBeTruthy();
  const roles = (await rolesRes.json()).data as { _id: string; name: string }[];
  const roleId = (name: RoleKey) => {
    const role = roles.find((r) => r.name === name);
    if (!role) throw new Error(`[roles] Backend Playwright chưa seed role ${name}`);
    return role._id;
  };

  const departmentId = (await apiCall(request, token, "post", "/departments", {
    name: `Khoa PW Role ${suffix}`,
    code: `KPR${suffix}`,
  }))!;

  const categoryIds: string[] = [];
  const makeAsset = async (base: "it-assets" | "medical-assets", tag: string, name: string) => {
    const rootId = (await apiCall(request, token, "post", `/${base}/categories`, { code: `PR${tag}${suffix}`, name: `Gốc PR ${tag} ${suffix}` }))!;
    const leafId = (await apiCall(request, token, "post", `/${base}/categories`, {
      code: `PRL${tag}${suffix}`,
      name: `Lá PR ${tag} ${suffix}`,
      parentCategory: rootId,
    }))!;
    categoryIds.push(leafId, rootId);
    return (await apiCall(request, token, "post", `/${base}`, { category: leafId, department: departmentId, name }))!;
  };
  const itAssetName = `Máy PR CNTT ${suffix}`;
  const medAssetName = `Máy PR y tế ${suffix}`;
  const itAssetId = await makeAsset("it-assets", "I", itAssetName);
  const medAssetId = await makeAsset("medical-assets", "M", medAssetName);

  const users = {} as RolesData["users"];
  for (const role of ROLE_KEYS) {
    const username = `pwr_${role.toLowerCase()}_${suffix}`;
    const id = (await apiCall(request, token, "post", "/users", {
      username,
      password: ROLE_PASSWORD,
      fullName: `PW Role ${role} ${suffix}`,
      role: roleId(role),
      department: departmentId,
    }))!;
    users[role] = { id, username };
  }

  // Ghi dữ liệu TRƯỚC khi đăng nhập UI: nếu bước đăng nhập lỗi, teardown vẫn dọn được những gì đã tạo.
  writeRolesData({ departmentId, categoryIds, itAssetId, itAssetName, medAssetId, medAssetName, users });

  for (const role of ROLE_KEYS) {
    const context = await browser.newContext(); // phiên trống, không dùng storageState của ADMIN
    const page = await context.newPage();
    await page.goto(`${baseURL}/login`);
    await page.getByLabel("Tên đăng nhập").fill(users[role].username);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(ROLE_PASSWORD);
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await page.waitForURL(`${baseURL}/app`);
    await context.storageState({ path: roleAuthPath(role) });
    await context.close();
  }
});
