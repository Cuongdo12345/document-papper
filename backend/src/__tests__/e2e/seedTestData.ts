// backend/src/__tests__/e2e/seedTestData.ts
//
// MỚI (DEV-048, 2026-09-12) — helper seed dữ liệu RBAC/Department/User THẬT
// (ghi vào MongoDB in-memory qua Mongoose, KHÔNG mock) cho test E2E. Tái sử
// dụng ĐÚNG nguồn sự thật của code (`PERMISSIONS`/`ROLE_PERMISSIONS`) — same
// principle với `scripts/seed-rbac.ts` — để RBAC trong test khớp 100% với
// RBAC thật đang chạy, không phải bản rút gọn có thể lệch dần theo thời gian.

import bcrypt from "bcrypt";
import { Permission } from "../../models/rbac/permission.model";
import { Role } from "../../models/rbac/role.model";
import Department from "../../models/departments/department.model";
import { User } from "../../models/users/user.model";
import { PERMISSIONS } from "../../shared/constants/permission.constant";
import { ROLE_PERMISSIONS } from "../../shared/constants/rolePermission.map";

/** Suy ra resource/action từ tên permission — mirror `seed-rbac.ts` (không cần chính xác tuyệt đối, chỉ ABAC/Policy dùng tới). */
const inferResourceAction = (name: string) => {
  const parts = name.split("_");
  return { resource: parts[0], action: parts.slice(1).join("_") || "MANAGE" };
};

/**
 * Seed ĐẦY ĐỦ Permission catalog + toàn bộ 7 Role (đúng permissions thật
 * theo `rolePermission.map.ts`) — dùng 1 lần trong `beforeAll` của mỗi file
 * E2E. Trả về map tên role → `_id` để dùng khi tạo User.
 */
export const seedRbac = async (): Promise<Record<string, string>> => {
  const nameToId = new Map<string, any>();

  for (const name of Object.values(PERMISSIONS)) {
    const { resource, action } = inferResourceAction(name);
    const doc = await Permission.create({ name, resource, action, description: name });
    nameToId.set(name, doc._id);
  }

  const roleIds: Record<string, string> = {};

  for (const [roleName, permissionNames] of Object.entries(ROLE_PERMISSIONS)) {
    const permissionIds = permissionNames
      .filter((p) => nameToId.has(p))
      .map((p) => nameToId.get(p));

    const role = await Role.create({
      name: roleName,
      permissions: permissionIds,
      // Đúng thực tế đã migrate ở DEV-047 — CHỈ ADMIN có cờ này.
      isSystemRole: roleName === "ADMIN",
    });
    roleIds[roleName] = role._id.toString();
  }

  return roleIds;
};

/** Seed 2 Department khác nhau — dùng để test department-scoping (DEV-030/034/040/041). */
export const seedDepartments = async (): Promise<{ deptA: string; deptB: string }> => {
  const deptA = await Department.create({ code: "KHOA-A", name: "Khoa A (test)" });
  const deptB = await Department.create({ code: "KHOA-B", name: "Khoa B (test)" });
  return { deptA: deptA._id.toString(), deptB: deptB._id.toString() };
};

export interface SeedUserInput {
  username: string;
  password: string;
  fullName: string;
  roleId: string;
  departmentId?: string;
}

/** Tạo 1 User thật (password hash bằng bcrypt thật, KHÔNG mock) — đăng nhập được qua `POST /api/auths/login` thật. */
export const seedUser = async (input: SeedUserInput) => {
  const hashed = await bcrypt.hash(input.password, 10);
  const user = await User.create({
    username: input.username,
    password: hashed,
    fullName: input.fullName,
    role: input.roleId,
    department: input.departmentId,
    isActive: true,
  });
  return user;
};
