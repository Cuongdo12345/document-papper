import fs from "node:fs";
import path from "node:path";
import type { APIRequestContext } from "@playwright/test";

/**
 * Playwright theo role (FE-46) — phần dùng chung giữa `roles.setup.ts`, `roles.teardown.ts` và các spec.
 *
 * Vì sao có nhóm riêng: project `chromium` (a11y, visual, asset-split) chạy bằng ADMIN trên DB trống, ảnh baseline
 * Dashboard/Người dùng phụ thuộc số khoa/phòng và số người dùng. Tài khoản + dữ liệu của nhóm này được tạo qua API
 * SAU khi project `chromium` chạy xong (`dependencies`) và được dọn ở `roles.teardown.ts`, nên không làm lệch baseline
 * kể cả khi tái sử dụng backend đang chạy (`reuseExistingServer`).
 */
export const BACKEND_PORT = Number(process.env.PW_BACKEND_PORT ?? 4100);
export const API = `http://localhost:${BACKEND_PORT}/api`;

// PHẢI khớp `PLAYWRIGHT_ADMIN_*` ở `backend/src/__tests__/e2e/startPlaywrightServer.ts` (duplicate có chủ đích, giống `global-setup.ts`).
export const ADMIN_USERNAME = "pw_admin_e2e";
export const ADMIN_PASSWORD = "Password123!";
export const ROLE_PASSWORD = "Password123!";

/** Tên role đúng như seed RBAC (`rolePermission.map.ts`). */
export const ROLE_KEYS = ["IT", "PHONG_VAT_TU_TTB", "USER"] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

const AUTH_DIR = path.join(import.meta.dirname, "..", ".auth");
export const ROLES_DATA_PATH = path.join(AUTH_DIR, "roles-data.json");
export const roleAuthPath = (role: RoleKey) => path.join(AUTH_DIR, `role-${role}.json`);

/** Dữ liệu `roles.setup.ts` đã tạo, để spec và teardown dùng lại. */
export interface RolesData {
  departmentId: string;
  categoryIds: string[]; // mọi danh mục đã tạo (con trước, gốc sau) — teardown xoá theo thứ tự này
  itAssetId: string;
  itAssetName: string;
  medAssetId: string;
  medAssetName: string;
  users: Record<RoleKey, { id: string; username: string }>;
}

export function writeRolesData(data: RolesData): void {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.writeFileSync(ROLES_DATA_PATH, JSON.stringify(data, null, 2));
}

export function readRolesData(): RolesData {
  return JSON.parse(fs.readFileSync(ROLES_DATA_PATH, "utf8")) as RolesData;
}

/** Đăng nhập qua API thật, trả access token. */
export async function apiLogin(request: APIRequestContext, username: string, password: string): Promise<string> {
  const res = await request.post(`${API}/auths/login`, { data: { username, password } });
  if (!res.ok()) throw new Error(`[roles] Đăng nhập API thất bại (${username}): ${res.status()} ${await res.text()}`);
  const token = (await res.json()).data?.accessToken as string | undefined;
  if (!token) throw new Error(`[roles] Đăng nhập API không trả accessToken (${username}) — tài khoản bật 2FA?`);
  return token;
}

/** POST/DELETE có token; ném lỗi kèm nội dung phản hồi nếu không phải 2xx. Với POST trả về id bản ghi mới (ném lỗi nếu phản hồi không có id). */
export async function apiCall(
  request: APIRequestContext,
  token: string,
  method: "post" | "delete",
  url: string,
  data?: unknown,
): Promise<string | undefined> {
  const res = await request[method](`${API}${url}`, { headers: { Authorization: `Bearer ${token}` }, data });
  if (!res.ok()) throw new Error(`[roles] ${method.toUpperCase()} ${url} -> ${res.status()} ${await res.text()}`);
  if (method === "delete") return undefined;
  const body = await res.json();
  // Tạo user trả `data.id`, các API khác trả `data._id`.
  const id = (body.data?._id ?? body.data?.id ?? body._id) as string | undefined;
  if (!id) throw new Error(`[roles] POST ${url} thành công nhưng không thấy id trong phản hồi: ${JSON.stringify(body).slice(0, 200)}`);
  return id;
}
