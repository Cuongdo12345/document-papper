/**
 * DEV-084 — E2E: danh sách thiết bị y tế theo phân loại (A/B/C/D), qua HTTP
 * THẬT (supertest + MongoDB in-memory).
 *
 * CLAUDE.md §18 — `GET /dashboard/medical-devices/by-class` là ROUTE MỚI
 * (dù dùng lại permission `DASHBOARD_READ` sẵn có) — PHẢI verify bằng request
 * HTTP thật xác nhận user KHÔNG có `DASHBOARD_READ` bị chặn đúng (403), không
 * chỉ giả định "cùng permission với route lân cận là an toàn".
 */
import request from "supertest";
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import { seedDepartments, seedRbac, seedUser } from "./seedTestData";

const PASSWORD = "Password123";

describe("E2E — Danh sách thiết bị y tế theo phân loại (DEV-084)", () => {
  let app: import("express").Express;
  let adminToken: string;
  let userToken: string; // role USER — có ASSET_VIEW nhưng KHÔNG có DASHBOARD_READ (xem rolePermission.map.ts)
  let deptId: string;
  const ids: Record<string, string> = {};

  const api = (token: string) => ({
    post: (url: string, body: any) => request(app).post(url).set("Authorization", `Bearer ${token}`).send(body),
    get: (url: string) => request(app).get(url).set("Authorization", `Bearer ${token}`),
  });

  beforeAll(async () => {
    await startE2EDatabase();
    app = (await import("../../app")).default;
    const roleIds = await seedRbac();
    deptId = (await seedDepartments()).deptA;

    await seedUser({ username: "class_admin", password: PASSWORD, fullName: "Admin class", roleId: roleIds.ADMIN, departmentId: deptId });
    adminToken = (await request(app).post("/api/auths/login").send({ username: "class_admin", password: PASSWORD })).body.data.accessToken;

    await seedUser({ username: "class_user", password: PASSWORD, fullName: "User thường", roleId: roleIds.USER, departmentId: deptId });
    userToken = (await request(app).post("/api/auths/login").send({ username: "class_user", password: PASSWORD })).body.data.accessToken;

    const admin = api(adminToken);
    const cat = await admin.post("/api/assets/asset-categories", { code: "MED_TEST", name: "Danh mục thiết bị test" });
    ids.category = cat.body.data._id;

    // 2 thiết bị Loại B, 1 thiết bị Loại C — đủ để phân biệt lọc đúng class + test phân trang.
    for (const [key, name] of [
      ["assetB1", "Máy thở ICU 1"],
      ["assetB2", "Máy thở ICU 2"],
      ["assetC1", "Monitor bệnh nhân 1"],
    ] as const) {
      const asset = await admin.post("/api/assets", { category: ids.category, department: deptId, name });
      ids[key] = asset.body.data._id;
    }
    await admin.post(`/api/assets/medical-devices/${ids.assetB1}/profile`, { deviceClass: "B", registrationNumber: "REG-B1" });
    await admin.post(`/api/assets/medical-devices/${ids.assetB2}/profile`, { deviceClass: "B", registrationNumber: "REG-B2" });
    await admin.post(`/api/assets/medical-devices/${ids.assetC1}/profile`, { deviceClass: "C", registrationNumber: "REG-C1" });
  }, 60_000);

  afterAll(async () => {
    await stopE2EDatabase();
  });

  it("không có token → 401", async () => {
    const res = await request(app).get("/api/dashboard/medical-devices/by-class?deviceClass=B");
    expect(res.status).toBe(401);
  });

  it("user KHÔNG có DASHBOARD_READ (role USER) → 403", async () => {
    const res = await api(userToken).get("/api/dashboard/medical-devices/by-class?deviceClass=B");
    expect(res.status).toBe(403);
  });

  it("thiếu/sai deviceClass → 400", async () => {
    const missing = await api(adminToken).get("/api/dashboard/medical-devices/by-class");
    expect(missing.status).toBe(400);

    const invalid = await api(adminToken).get("/api/dashboard/medical-devices/by-class?deviceClass=Z");
    expect(invalid.status).toBe(400);
  });

  it("ADMIN + deviceClass=B → 200, CHỈ trả đúng 2 thiết bị Loại B (không lẫn Loại C)", async () => {
    const res = await api(adminToken).get("/api/dashboard/medical-devices/by-class?deviceClass=B");
    expect(res.status).toBe(200);
    expect(res.body.pagination).toMatchObject({ total: 2 });
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.every((d: any) => d.deviceClass === "B")).toBe(true);
    expect(res.body.data.map((d: any) => d.asset.name).sort()).toEqual(["Máy thở ICU 1", "Máy thở ICU 2"]);
    // Khớp đúng field đã project — không rò rỉ field nội bộ.
    expect(res.body.data[0].asset).toMatchObject({ assetCode: expect.any(String), department: { name: expect.any(String) } });
  });

  it("deviceClass=C → 200, chỉ 1 thiết bị, phân trang đúng", async () => {
    const res = await api(adminToken).get("/api/dashboard/medical-devices/by-class?deviceClass=C&limit=1&page=1");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].asset.name).toBe("Monitor bệnh nhân 1");
    expect(res.body.pagination).toMatchObject({ total: 1, totalPages: 1 });
  });

  it("deviceClass=D (không có thiết bị nào) → 200, mảng rỗng", async () => {
    const res = await api(adminToken).get("/api/dashboard/medical-devices/by-class?deviceClass=D");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });
});
