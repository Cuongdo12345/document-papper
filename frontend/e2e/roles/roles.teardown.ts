import fs from "node:fs";
import { test as teardown } from "@playwright/test";
import { ADMIN_PASSWORD, ADMIN_USERNAME, ROLES_DATA_PATH, ROLE_KEYS, apiCall, apiLogin, readRolesData } from "./roles.shared.js";

/**
 * Playwright theo role (FE-46) — dọn dữ liệu của `roles.setup.ts` để backend (nếu được tái sử dụng) trở lại như trước:
 * xoá thiết bị (vĩnh viễn), danh mục, tài khoản (xoá mềm → biến mất khỏi danh sách mặc định) và khoa/phòng (Dashboard đếm khoa/phòng).
 * Chạy cả khi spec lỗi (project `teardown`). Không có file dữ liệu = setup chưa chạy tới đâu cả → không có gì để dọn.
 */
teardown("dọn dữ liệu và tài khoản theo role", async ({ request }) => {
  if (!fs.existsSync(ROLES_DATA_PATH)) return;
  const data = readRolesData();
  const token = await apiLogin(request, ADMIN_USERNAME, ADMIN_PASSWORD);

  // Mỗi bước độc lập: một bước lỗi không bỏ qua các bước còn lại; gom lỗi để báo cuối cùng.
  const errors: string[] = [];
  const run = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      errors.push(`${label}: ${(e as Error).message}`);
    }
  };

  // Xoá VĨNH VIỄN (backend chỉ cho sau khi đã xoá mềm): backend chặn xoá danh mục/khoa nếu còn tài sản tham chiếu,
  // kể cả tài sản đã xoá mềm.
  for (const [label, base, id] of [
    ["CNTT", "it-assets", data.itAssetId],
    ["y tế", "medical-assets", data.medAssetId],
  ] as const) {
    await run(`xoá mềm thiết bị ${label}`, () => apiCall(request, token, "delete", `/${base}/${id}`));
    await run(`xoá vĩnh viễn thiết bị ${label}`, () => apiCall(request, token, "delete", `/${base}/${id}/permanent`));
  }
  for (const [i, id] of data.categoryIds.entries()) {
    const base = i < 2 ? "it-assets" : "medical-assets"; // categoryIds = [lá IT, gốc IT, lá y tế, gốc y tế]
    await run(`xoá danh mục ${id}`, () => apiCall(request, token, "delete", `/${base}/categories/${id}`));
  }
  for (const role of ROLE_KEYS) {
    await run(`xoá tài khoản ${role}`, () => apiCall(request, token, "delete", `/users/${data.users[role].id}`));
  }
  await run("xoá khoa/phòng", () => apiCall(request, token, "delete", `/departments/${data.departmentId}`));

  if (errors.length > 0) throw new Error(`[roles] Dọn dữ liệu chưa sạch:\n${errors.join("\n")}`);
  fs.rmSync(ROLES_DATA_PATH, { force: true });
});
