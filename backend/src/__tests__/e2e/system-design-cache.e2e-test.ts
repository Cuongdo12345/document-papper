/**
 * BR-21 (docs/31_BACKEND_CODE_REVIEW.md, DEV-107, 2026-09-30) — E2E:
 * `GET /api/system-design` không còn đọc lại ~150 file task ở mỗi request
 * (cache 60 giây). Qua HTTP THẬT; đếm số lần đọc file task thật bằng spy trên
 * `fs.readFileSync`. Cũng xác nhận route vẫn được bảo vệ (401/403) và dữ liệu
 * trả về không đổi giữa lần đọc đĩa và lần dùng cache.
 *
 * Không có route/permission mới (`SYSTEM_DESIGN_VIEW` đã có).
 */
import request from "supertest";
import fs from "fs";
import path from "path";
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import { seedRbac, seedDepartments, seedUser } from "./seedTestData";
import { clearAllMemoryCache } from "../../shared/cache/memoryCache";

const PASSWORD = "Password123";

describe("E2E — System Design: cache kết quả quét file task (BR-21)", () => {
  let app: import("express").Express;
  let adminToken: string;
  let userToken: string;
  let readSpy: jest.SpyInstance;

  const isTaskFile = (p: unknown) => {
    const posix = String(p).split(path.sep).join("/");
    return posix.endsWith(".md") && (posix.includes("/docs/development/tasks/") || posix.includes("/docs/frontend/tasks/"));
  };
  const taskReads = () => readSpy.mock.calls.filter((c) => isTaskFile(c[0])).length;
  const getDesign = (token?: string) => {
    const req = request(app).get("/api/system-design");
    return token ? req.set("Authorization", `Bearer ${token}`) : req;
  };

  beforeAll(async () => {
    await startE2EDatabase();
    app = (await import("../../app")).default;
    const roleIds = await seedRbac();
    const { deptA } = await seedDepartments();
    await seedUser({ username: "sd_admin", password: PASSWORD, fullName: "Admin", roleId: roleIds.ADMIN, departmentId: deptA });
    await seedUser({ username: "sd_user", password: PASSWORD, fullName: "User", roleId: roleIds.USER, departmentId: deptA });
    adminToken = (await request(app).post("/api/auths/login").send({ username: "sd_admin", password: PASSWORD })).body.data.accessToken;
    userToken = (await request(app).post("/api/auths/login").send({ username: "sd_user", password: PASSWORD })).body.data.accessToken;
  }, 60_000);

  afterAll(async () => {
    await stopE2EDatabase();
  });

  beforeEach(() => {
    clearAllMemoryCache();
    readSpy = jest.spyOn(fs, "readFileSync");
  });
  afterEach(() => readSpy.mockRestore());

  it("không token -> 401; USER thiếu SYSTEM_DESIGN_VIEW -> 403 (route vẫn được bảo vệ, không đọc file nào)", async () => {
    expect((await getDesign()).status).toBe(401);
    expect((await getDesign(userToken)).status).toBe(403);
    expect(taskReads()).toBe(0);
  });

  it("lần đầu đọc file task; các lần sau trong 60 giây KHÔNG đọc file nào", async () => {
    const first = await getDesign(adminToken);
    expect(first.status).toBe(200);
    const afterFirst = taskReads();
    expect(afterFirst).toBeGreaterThan(100);

    expect((await getDesign(adminToken)).status).toBe(200);
    expect((await getDesign(adminToken)).status).toBe(200);
    expect(taskReads()).toBe(afterFirst);
  });

  it("dữ liệu lần dùng cache GIỐNG HỆT lần đọc đĩa; module 'vendors' vẫn có DEV-057", async () => {
    const first = await getDesign(adminToken);
    const second = await getDesign(adminToken);

    expect(second.body).toEqual(first.body);
    const vendors = first.body.data.modules.find((m: any) => m.name === "vendors");
    expect(vendors.relatedDocs.map((d: any) => d.path)).toContain("docs/development/tasks/DEV-057.md");
  });
});
