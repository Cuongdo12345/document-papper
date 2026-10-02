/**
 * BR-04 (docs/31_BACKEND_CODE_REVIEW.md, DEV-093, 2026-09-29) — E2E: ADMIN
 * KHÔNG còn sinh 1 bản ghi audit cho MỌI request; chỉ ghi `ADMIN_BYPASS` khi
 * bypass thực sự có tác dụng (quyền hiệu lực của Admin không đủ). Qua HTTP
 * THẬT (supertest + MongoDB in-memory).
 */
import request from "supertest";
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import { seedRbac, seedUser } from "./seedTestData";
import UserAudit from "../../models/users/userAudit.model";
import { Permission } from "../../models/rbac/permission.model";
import { Role } from "../../models/rbac/role.model";
import { clearAllPermissionCache } from "../../services/rbac/permission.cache";

const PASSWORD = "Password123";

/** Hàm audit chạy fire-and-forget sau `next()` — chờ ngắn cho nó kịp ghi. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 300));

describe("E2E — Audit ADMIN bypass chỉ ghi khi vượt quyền thật (BR-04)", () => {
  let app: import("express").Express;
  let adminRoleId: string;
  let token: string;

  beforeAll(async () => {
    await startE2EDatabase();
    app = (await import("../../app")).default;
    const roleIds = await seedRbac();
    adminRoleId = roleIds.ADMIN;
    await seedUser({ username: "admin_br04", password: PASSWORD, fullName: "Admin BR-04", roleId: adminRoleId });
    token = (await request(app).post("/api/auths/login").send({ username: "admin_br04", password: PASSWORD })).body.data.accessToken;
  }, 60_000);

  afterAll(async () => {
    await stopE2EDatabase();
  });

  const bypassCount = () => UserAudit.countDocuments({ action: "ADMIN_BYPASS" });

  it("Admin có đủ quyền (role ADMIN seed đủ mọi permission): gọi nhiều request -> 0 bản ghi audit bypass", async () => {
    for (let i = 0; i < 5; i++) {
      const res = await request(app).get("/api/departments").set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
    }
    await settle();
    expect(await bypassCount()).toBe(0);
    expect(await UserAudit.countDocuments({ action: "AUDIT_DASHBOARD_VIEW" })).toBe(0);
  });

  it("gỡ DEPARTMENT_VIEW khỏi role ADMIN: vẫn được cho qua (200) VÀ ghi đúng 1 ADMIN_BYPASS", async () => {
    const perm = await Permission.findOne({ name: "DEPARTMENT_VIEW" });
    await Role.updateOne({ _id: adminRoleId }, { $pull: { permissions: perm!._id } });
    clearAllPermissionCache();

    const res = await request(app).get("/api/departments").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    await settle();

    const rows = await UserAudit.find({ action: "ADMIN_BYPASS" }).lean();
    expect(rows).toHaveLength(1);
    expect(rows[0].note).toBe("ADMIN bypass permission check: DEPARTMENT_VIEW");
  });
});
