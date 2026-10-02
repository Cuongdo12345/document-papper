/**
 * BR-03 (docs/31_BACKEND_CODE_REVIEW.md, DEV-092, 2026-09-29) — E2E: tạo
 * tài liệu KHÔNG còn tin `department` client gửi lên. Qua HTTP THẬT
 * (supertest + MongoDB in-memory). Permission MỚI
 * `DOCUMENT_CREATE_ALL_DEPARTMENTS` — theo CLAUDE.md §18 PHẢI verify 403 thật
 * với user thiếu quyền, và 201 với user có quyền.
 */
import request from "supertest";
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import { seedRbac, seedDepartments, seedUser } from "./seedTestData";
import { Permission } from "../../models/rbac/permission.model";
import { Role } from "../../models/rbac/role.model";
import { Document } from "../../models/documents/document.model";

const PASSWORD = "Password123";

describe("E2E — Tạo tài liệu: phạm vi khoa (BR-03)", () => {
  let app: import("express").Express;
  let deptA: string;
  let deptB: string;
  const tokens: Record<string, string> = {};

  const create = (who: string, department: string, extra: Record<string, unknown> = {}) =>
    request(app)
      .post("/api/documents/proposal")
      .set("Authorization", `Bearer ${tokens[who]}`)
      .send({
        category: "PROPOSAL",
        subType: "PROPOSE_PROCUREMENT",
        title: `Đề xuất BR-03 (${who})`,
        department,
        meta: { note: "br03" },
        ...extra,
      });

  beforeAll(async () => {
    await startE2EDatabase();
    app = (await import("../../app")).default;

    const roleIds = await seedRbac();
    ({ deptA, deptB } = await seedDepartments());

    // Role tuỳ biến: USER + DOCUMENT_CREATE_ALL_DEPARTMENTS (mô phỏng gán qua UI "Phân quyền").
    const extraPerm = await Permission.findOne({ name: "DOCUMENT_CREATE_ALL_DEPARTMENTS" });
    const userRole = await Role.findById(roleIds.USER);
    const crossRole = await Role.create({
      name: "USER_CROSS_DEPT",
      permissions: [...userRole!.permissions, extraPerm!._id],
    });

    await seedUser({ username: "user_a", password: PASSWORD, fullName: "User khoa A", roleId: roleIds.USER, departmentId: deptA });
    await seedUser({ username: "user_nodept", password: PASSWORD, fullName: "User không khoa", roleId: roleIds.USER });
    await seedUser({ username: "cross_a", password: PASSWORD, fullName: "Có quyền tạo mọi khoa", roleId: crossRole._id.toString(), departmentId: deptA });
    await seedUser({ username: "admin_a", password: PASSWORD, fullName: "Admin", roleId: roleIds.ADMIN, departmentId: deptA });

    for (const u of ["user_a", "user_nodept", "cross_a", "admin_a"]) {
      tokens[u] = (await request(app).post("/api/auths/login").send({ username: u, password: PASSWORD })).body.data.accessToken;
    }
  }, 60_000);

  afterAll(async () => {
    await stopE2EDatabase();
  });

  it("không token -> 401", async () => {
    const res = await request(app).post("/api/documents/proposal").send({});
    expect(res.status).toBe(401);
  });

  it("USER tạo cho khoa của mình -> 201", async () => {
    const res = await create("user_a", deptA);
    expect(res.status).toBe(201);
    expect(res.body.data.department.toString()).toBe(deptA);
  });

  it("USER tạo cho khoa khác (thiếu DOCUMENT_CREATE_ALL_DEPARTMENTS) -> 403, không tạo gì", async () => {
    const before = await Document.countDocuments({ department: deptB });
    const res = await create("user_a", deptB);
    expect(res.status).toBe(403);
    expect(await Document.countDocuments({ department: deptB })).toBe(before);
  });

  it("USER chưa thuộc khoa nào -> 403", async () => {
    const res = await create("user_nodept", deptA);
    expect(res.status).toBe(403);
  });

  it("body gửi kèm isAdmin/canCreateAllDepartments/callerDepartment giả -> không có tác dụng (403)", async () => {
    const res = await create("user_a", deptB, {
      isAdmin: true,
      canCreateAllDepartments: true,
      callerDepartment: deptB,
    });
    expect(res.status).toBe(403);
  });

  it("có DOCUMENT_CREATE_ALL_DEPARTMENTS -> tạo cho khoa khác được (201)", async () => {
    const res = await create("cross_a", deptB);
    expect(res.status).toBe(201);
    expect(res.body.data.department.toString()).toBe(deptB);
  });

  it("ADMIN -> tạo cho khoa khác được (201)", async () => {
    const res = await create("admin_a", deptB);
    expect(res.status).toBe(201);
  });
});
